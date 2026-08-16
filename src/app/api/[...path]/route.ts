import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NEST_BASE, WORKER_BASE, COOKIES, backendFetch, safeJson } from '@/lib/edgeProxy';
import { OPAQUE_API, PROXY_OP_ROUTES } from '@/lib/opcodeMap';
import { POST as gatewayPost } from '../p/route';

/**
 * Per-request random gateway paths (see src/lib/p.ts): the client posts each
 * opcode to `/api/<24 lowercase hex chars>` so the Network tab shows a
 * different name every time instead of a constant "p". No real proxied
 * endpoint is a bare 24-hex segment, so the shape alone identifies a gateway
 * call. Kept in sync with gatewayPath() in p.ts.
 */
const GATEWAY_PATH = /^\/api\/[0-9a-f]{24}$/;

// Proxied-path opcodes (NestJS reset-passcode, KYC worker re-verify) live in
// the shared map so the client can call the real endpoints when
// NEXT_PUBLIC_OPAQUE_API=false. A random-hash gateway request whose `o`
// matches rewrites to the real path/method and falls through to the normal
// proxy flow (auth injection, step-token rewrite, KYC service binding all
// apply); any other opcode dispatches to the opcode gateway (api/p).

/**
 * Real paths of the proxied opcodes. In opaque mode these are reachable ONLY
 * via the random-hash gateway; a direct external hit to the descriptive name
 * gets 404 (mirrors notGateway() for the api/p handlers) so scanners can't
 * confirm the endpoint exists. All PROXY_OP_ROUTES paths are static.
 */
const PROXY_OP_PATHS = new Set(Object.values(PROXY_OP_ROUTES).map((r) => r.path()));

/**
 * Service binding to the KYC Worker. Same-account Worker→Worker fetches over
 * `*.workers.dev` URLs never trigger the target Worker — Cloudflare serves the
 * bare "There is nothing here yet" 404 instead — so on Cloudflare the KYC
 * proxy MUST go through this binding. Returns null outside workerd (local
 * `next dev`), where plain fetch to WORKER_BASE (localhost:8787) still works.
 */
function kycBinding(): { fetch: typeof fetch } | null {
    try {
        const { env } = getCloudflareContext();
        return (env as { KYC_WORKER?: { fetch: typeof fetch } }).KYC_WORKER ?? null;
    } catch {
        return null;
    }
}


/**
 * Generic API proxy (replaces the Cloudflare Worker's catch-all).
 *
 * - `/api/kyc/*`  → forwarded to the Worker (KYC must run on Cloudflare Workers).
 * - everything else → NestJS directly, with `Authorization: Bearer <rdb_at>` injected
 *   from the httpOnly cookie (read server-side here, where the Worker used to do it).
 *
 * Cookie-mutating endpoints (auth/session-complete, logout, profile/me, sessions/*)
 * have dedicated, more-specific route handlers that take precedence over this one.
 */
async function proxy(req: NextRequest): Promise<NextResponse> {
    let { pathname } = req.nextUrl;
    let method = req.method;
    let body: ArrayBuffer | string | undefined;

    if (req.method === 'POST' && GATEWAY_PATH.test(pathname)) {
        // Random-hash gateway call ({o, d} body). Proxied-path opcodes rewrite
        // to their real endpoint and continue through the proxy flow below;
        // every other opcode dispatches to the opcode gateway (api/p).
        const raw = await req.text();
        let op: { o?: string; d?: unknown } = {};
        try {
            op = JSON.parse(raw);
        } catch {
            /* unknown shape → gateway answers 404 */
        }
        const def = PROXY_OP_ROUTES[op.o ?? ''];
        if (!def) {
            return gatewayPost(
                new NextRequest(req.nextUrl, { method: 'POST', headers: req.headers, body: raw }),
            );
        }
        pathname = def.path(op.d);
        method = def.method;
        body = method === 'GET' ? undefined : JSON.stringify(op.d ?? {});
    } else {
        // Opaque mode: a direct external hit to a proxied opcode's descriptive
        // path (not arriving via the hash gateway) is hidden — 404, so scanners
        // can't confirm the endpoint exists. Legitimate traffic always rewrites
        // in through the gateway branch above (viaGateway = true).
        if (OPAQUE_API && PROXY_OP_PATHS.has(pathname)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();
    }

    const isKyc = pathname === '/api/kyc' || pathname.startsWith('/api/kyc/');

    const contentType = req.headers.get('content-type');
    const acceptLanguage = req.headers.get('accept-language');

    // Next.js injects the [...path] catch-all segment into searchParams under the key
    // `path`. Strip it so it isn't forwarded to NestJS (whose strict validation rejects
    // unknown query props with "property path should not exist").
    const params = new URLSearchParams(req.nextUrl.searchParams);
    params.delete('path');
    const qs = params.toString();
    const search = qs ? `?${qs}` : '';

    // KYC keeps its existing path (the Worker mounts `/api/kyc`); everything else
    // drops the `/api` prefix to hit NestJS routes (e.g. `/api/users/me` → `/users/me`).
    const base = isKyc ? WORKER_BASE : NEST_BASE;
    const path = (isKyc ? pathname : pathname.replace(/^\/api/, '')) + search;

    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (acceptLanguage) headers['Accept-Language'] = acceptLanguage;

    // Inject auth for NestJS-direct calls. KYC carries its own cookie chain to the
    // Worker, which still injects auth there.
    if (!isKyc) {
        // Mid-login reset-passcode set (RESET_PASSCODE_WEB_INTEGRATION.md §0.1):
        // there is no access token yet — the bearer is the 10-min login stepToken
        // (from the X-Step-Token header the client sends, or the rdb_step cookie).
        const isStepReset = pathname.startsWith('/api/auth/reset-passcode/step');
        const stepToken = req.headers.get('x-step-token') ?? req.cookies.get(COOKIES.step)?.value;
        // Mid-login face branch: the single-use face proof rides its own header
        // (X-Step-Token is taken by the login stepToken → Authorization rewrite).
        // Pass it through untouched (RESET_PASSCODE_STEP_FACE_WEB_INTEGRATION.md §3).
        const faceStepToken = req.headers.get('x-face-step-token');
        if (isStepReset) {
            if (stepToken) headers['Authorization'] = `Bearer ${stepToken}`;
            if (faceStepToken) headers['X-Face-Step-Token'] = faceStepToken;
        } else {
            const token = req.cookies.get(COOKIES.access)?.value;
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        // Forward a step-up token (from the X-Step-Token header or the short-lived
        // rdb_step cookie) so gated actions (transfer, withdraw, …) can prove a
        // just-completed step-up — e.g. a face re-verification — to NestJS.
        if (stepToken) headers['X-Step-Token'] = stepToken;
        // Forward the *real* browser IP so NestJS can geo-locate the web device for
        // the (non-blocking) same-city check on the QR flow. At the Cloudflare edge
        // the genuine client IP is in `cf-connecting-ip` (CF sets it on inbound);
        // `x-forwarded-for` is a fallback for non-CF environments.
        //
        // We must NOT rely on `cf-connecting-ip` reaching NestJS: on the Worker→origin
        // hop Cloudflare overwrites it with the Worker's own egress IP, so the browser
        // IP would be lost and every web device would resolve to the same datacentre
        // → same-city always true. Instead we pin it onto a custom header that CF
        // passes through untouched, and prepend it to X-Forwarded-For. The backend's
        // resolveClientIp must read X-Client-IP first (see note in that file).
        const clientIp =
            req.headers.get('cf-connecting-ip') ??
            req.headers.get('x-real-ip') ??
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
            null;
        if (clientIp) {
            headers['X-Client-IP'] = clientIp;
            const existingXff = req.headers.get('x-forwarded-for');
            const firstXff = existingXff?.split(',')[0]?.trim();
            // Only prepend when our resolved IP isn't already the leading XFF entry,
            // otherwise we'd duplicate it (e.g. "::1, ::1" in local dev).
            headers['X-Forwarded-For'] =
                !existingXff || firstXff === clientIp
                    ? clientIp
                    : `${clientIp}, ${existingXff}`;
        }
        // Visible in `npm run dev` AND in Cloudflare Pages real-time logs
        // (`wrangler pages deployment tail` or the dashboard → Functions → Logs).
        console.log(
            `[api proxy] client IP: ${clientIp} | X-Client-IP: ${headers['X-Client-IP']} | X-Forwarded-For: ${headers['X-Forwarded-For']}`,
        );
    } else {
        // KYC → Worker: forward the cookie header so the Worker can read rdb_at.
        const cookie = req.headers.get('cookie');
        if (cookie) headers['Cookie'] = cookie;
    }

    let res: Response;
    try {
        const binding = isKyc ? kycBinding() : null;
        res = binding
            ? await binding.fetch(`${WORKER_BASE}${path}`, {
                  method,
                  headers,
                  body: body as BodyInit | undefined,
              })
            : await backendFetch(base, path, { method, headers, body });
    } catch (err) {
        // `fetch failed` alone is useless — surface the undici cause chain.
        const cause = (err as { cause?: unknown })?.cause;
        console.error(`[api proxy] ${method} ${path} → ${base} failed:`, err, '| cause:', cause);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }

    const data = await safeJson(res);
    // Diagnostic for the reset-passcode integration: shows which bearer was sent
    // and what NestJS answered (visible in `npm run dev` console).
    if (pathname.startsWith('/api/auth/reset-passcode')) {
        const auth = headers['Authorization'];
        console.log(
            `[reset-passcode] ${method} ${path} → ${res.status} | bearer=${
                auth ? `${auth.slice(7, 19)}… (len ${auth.length - 7})` : 'NONE'
            } | stepHeader=${req.headers.get('x-step-token') ? 'yes' : 'no'} | stepCookie=${
                req.cookies.get(COOKIES.step)?.value ? 'yes' : 'no'
            } | faceHeader=${req.headers.get('x-face-step-token') ? 'yes' : 'no'} | body=${JSON.stringify(data).slice(0, 300)}`,
        );
    }
    return NextResponse.json(data, { status: res.status });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
