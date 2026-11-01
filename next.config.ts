import path from 'path';
import { networkInterfaces } from 'os';
import type { NextConfig } from 'next';

// Dev-only network fix: on networks where the TCP connect to Cloudflare takes
// longer than Node's 250ms happy-eyeballs attempt timeout (~500ms observed),
// every dev-proxy fetch to the Worker (*.workers.dev) dies with
// AggregateError ETIMEDOUT → 502 "Backend unavailable". next.config runs in
// the same Node process as the dev server's edge-sandbox fetch, so raising the
// global attempt timeout here fixes it. Production runs on the Cloudflare edge
// where node:net doesn't exist — hence dev-only and failure-tolerant.
if (process.env.NODE_ENV !== 'production') {
    import('net')
        .then((net) => {
            net.setDefaultAutoSelectFamilyAttemptTimeout?.(3000);
        })
        .catch(() => {});
}

function rank(ip: string): number {
    if (ip.startsWith('192.168.')) return 0;
    if (/^172.(1[6-9]|2d|3[01])./.test(ip)) return 1;
    return 2;
}

/**
 * This machine's LAN IPv4s, dev only. Link-local 169.254.* is unroutable.
 * Override the one the QR uses with DEV_LAN_HOST (PowerShell:
 * `$env:DEV_LAN_HOST='192.168.1.5'; npm run dev:mobile`).
 */
const LAN_ADDRESSES: string[] =
    process.env.NODE_ENV === 'production'
        ? []
        : Object.values(networkInterfaces())
              .flat()
              .filter((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
              .map((a) => a!.address)
              // Wi-Fi first: 192.168.* is what a phone on the same network sees;
              // 10.* is as often a VPN adapter, which the phone cannot reach.
              .sort((x, y) => rank(x) - rank(y));

const nextConfig: NextConfig = {
    // Required by OpenNext (Cloudflare Workers deploy): the Worker bundle is
    // built from .next/standalone. OpenNext normally injects this itself, but
    // our build runs `next build --webpack` separately (--skipNextBuild).
    output: 'standalone',
    // Pin the tracing root to this repo. Without it Next infers the root from
    // lockfiles above the repo (the user home dir has one), producing
    // .next/standalone/Desktop/... and OpenNext can't find the server manifests.
    // Was '../../' while the app lived in apps/frontend of a workspace.
    outputFileTracingRoot: __dirname,
    // LAN addresses this dev server may be reached on from a phone (`npm run
    // dev:mobile`). Testing ID capture on a real device matters: a laptop webcam
    // is front-facing, low-resolution and fixed-focus, so the document scanner
    // struggles to find a clean card quad. Add your machine's current IPv4 here
    // if it changes — DHCP will reassign it.
    // The machine's CURRENT addresses are added at start-up: a hardcoded list
    // goes stale the moment DHCP moves the machine (it is on 192.168.43.* now),
    // and Next then blocks /_next assets for the phone — the page loads as
    // dead HTML and the KYC QR hand-off never starts.
    allowedDevOrigins: ['192.168.1.100', '192.168.1.101', '172.20.10.2', ...LAN_ADDRESSES],
    env: {
        // Where the phone reaches this dev server. The camera hand-off QR uses
        // it when the desktop itself is on localhost — a phone cannot open
        // "localhost". Empty in production, where the page origin is public.
        NEXT_PUBLIC_DEV_LAN_ORIGIN:
            process.env.NODE_ENV !== 'production' && (process.env.DEV_LAN_HOST || LAN_ADDRESSES[0])
                ? `https://${process.env.DEV_LAN_HOST || LAN_ADDRESSES[0]}:${process.env.PORT ?? '3000'}`
                : '',
    },
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'livegold-c2c-media.s3.us-east-1.amazonaws.com',
            },
        ],
    },
    // No /api rewrite: all of /api/* is served by Next.js Route Handlers
    // (apps/frontend/src/app/api/**), which proxy to NestJS directly and forward
    // only /api/kyc/* to the Cloudflare Worker. See src/lib/edgeProxy.ts.
    async headers() {
        // Security-response headers applied to every route on the Worker.
        // OpenNext bakes these into the routes-manifest, so they ride on every
        // document + API response the Next handler produces.
        //
        // CSP note: 'unsafe-inline'/'unsafe-eval' are required by Next.js App
        // Router hydration + the KYC SDKs (WASM, liveness, avatar). connect/img/
        // media/frame use `https:`/`wss:` rather than an explicit allow-list so
        // the NestJS API, socket.io, Cloudinary/S3, and the face-verify SDKs keep
        // working. It still blocks: framing (clickjacking), plugin/object
        // injection, <base> hijacking, cross-origin form posts, and HTTP
        // downgrade. Tighten script-src to nonces + pin the exact SDK hosts once
        // the KYC provider list is fixed. See docs/security-posture.md.
        const csp = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "media-src 'self' blob: https:",
            // `data:` is required by opencv.js, which fetches its own WASM from
            // an embedded data: URI. Without it the fetch is blocked, OpenCV
            // never initialises, and ID capture silently stops finding document
            // corners — the failure surfaces as a frame that scans forever.
            //
            // The Observe collector origin is already covered by `https:`, but
            // is named so that tightening this list later cannot silently kill
            // error reporting — a blocked send produces no logs and no error.
            "connect-src 'self' data: https: wss: https://ramaaz-observe.yazan-adnof.workers.dev",
            "frame-src 'self' https:",
            "worker-src 'self' blob:",
            "child-src 'self' blob:",
            "manifest-src 'self'",
            'upgrade-insecure-requests',
        ].join('; ');

        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Content-Security-Policy', value: csp },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    {
                        // KYC needs camera + microphone (self); everything else off.
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), browsing-topics=()',
                    },
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                    { key: 'X-DNS-Prefetch-Control', value: 'off' },
                ],
            },
        ];
    },
};

export default nextConfig;
