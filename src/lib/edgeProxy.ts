import { appConfig } from '@/config/app';
import { OPAQUE_API } from '@/lib/opcodeMap';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes fronted by the /api/p gateway answer 404 to direct external hits.
 * The gateway invokes their handlers as functions with the internal X-PG
 * marker stamped on a synthesized request — only those pass. This hides the
 * descriptive endpoint names from both the Network tab and endpoint scanners.
 *
 * With NEXT_PUBLIC_OPAQUE_API=false (real-API debug mode) the named routes
 * answer direct hits again, matching the client calling them by name.
 */
export function notGateway(req: NextRequest): NextResponse | null {
    if (!OPAQUE_API) return null;
    return req.headers.get('x-pg') === '1'
        ? null
        : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Edge-runtime proxy helpers for Next.js Route Handlers (Cloudflare Pages Functions).
 *
 * These relocate the work the Cloudflare Worker used to do for auth/profile/sessions
 * into the Pages app itself: read the httpOnly `rdb_at` cookie server-side, inject
 * `Authorization: Bearer`, and forward to NestJS directly. The Worker is now only
 * responsible for `/api/kyc/*`.
 *
 * Runs on the same workerd runtime as the Worker, so the underscore-hostname fetch
 * handling is ported verbatim from the Worker's backendFetch.
 */

const isProduction = process.env.NODE_ENV === 'production';

/** NestJS origin — everything non-KYC proxies here directly. */
export const NEST_BASE = process.env.NEXT_PUBLIC_BASE_URL ?? appConfig.baseUrl;

/**
 * Cloudflare Worker origin — only `/api/kyc/*` is forwarded here.
 *
 * The KYC API lives in its own repo (github.com/Yazan-Rammaz/ramaaz-kyc) and
 * deploys as the `ramaaz-kyc` Worker. The previous fallback, `rdb-kyc-worker`,
 * was built from this repo's packages/kyc-server, which no longer exists here —
 * leaving it would silently pin production to a deployment nothing can rebuild.
 */
export const WORKER_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    (isProduction ? 'https://ramaaz-kyc.yazan-adnof.workers.dev' : 'http://localhost:8787');

/**
 * Underscore-aware fetch. `trydos_wallet_develop.ramaaz.dev` contains underscores,
 * which are invalid in DNS hostnames; workerd needs the Host header set explicitly
 * for these. Mirrors the Worker's backendFetch so behaviour is identical.
 */
export async function backendFetch(
    baseUrl: string,
    path: string,
    init: {
        method?: string;
        headers?: Record<string, string>;
        body?: string | ArrayBuffer | FormData | null;
    } = {},
): Promise<Response> {
    const url = `${baseUrl}${path}`;
    const hostname = new URL(url).hostname;
    const hasUnderscore = hostname.includes('_');

    const fetchInit: RequestInit = {
        method: init.method ?? 'GET',
        headers: (hasUnderscore
            ? { Host: hostname, ...(init.headers ?? {}) }
            : (init.headers ?? {})) as HeadersInit,
        body: (init.body ?? undefined) as BodyInit | undefined,
    };
    return fetch(url, fetchInit);
}

/** Auth cookie names — kept in sync with secure-cookies.ts and the (legacy) Worker. */
export const COOKIES = {
    access: 'rdb_at',
    refresh: 'rdb_rt',
    user: 'rdb_user',
    session: 'rdb_st',
    step: 'rdb_step',
    /**
     * Access-token expiry (epoch ms), readable by client JS (NOT httpOnly) so the
     * client can proactively refresh ~1 min before expiry. Carries no secret — just
     * the timestamp; the token itself stays in the httpOnly `rdb_at`.
     */
    accessExp: 'rdb_at_exp',
    /**
     * Current session id, readable by client JS (NOT httpOnly). No secret — just an
     * opaque id used to tell THIS session apart from others: when a
     * `session:revoked_by_new_login` event arrives (broadcast to every one of the
     * user's sockets), only the session whose id equals the event's `revokedSessionId`
     * reacts; the brand-new session that triggered it ignores the event.
     */
    sessionId: 'rdb_sid',
} as const;

export function cookieOptions(maxAgeSeconds: number) {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict' as const,
        path: '/',
        maxAge: maxAgeSeconds,
    };
}

/** Parse a JSON body from an upstream Response, tolerating empty/non-JSON bodies. */
export async function safeJson(res: Response): Promise<Record<string, unknown>> {
    return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Derive a cookie Max-Age (seconds) from a token's `expiresAt` ISO timestamp.
 * Access tokens are now ~15 min and refresh tokens ~30 days, so the cookie must
 * track the *real* token lifetime instead of a hardcoded value — otherwise the
 * cookie outlives the JWT inside it and every call 401s with no recovery.
 * Falls back to `fallbackSeconds` when `expiresAt` is missing/unparseable.
 */
export function maxAgeFromExpiry(expiresAt: unknown, fallbackSeconds: number): number {
    if (typeof expiresAt === 'string') {
        const ms = new Date(expiresAt).getTime();
        if (!Number.isNaN(ms)) {
            return Math.max(0, Math.floor((ms - Date.now()) / 1000));
        }
    }
    return fallbackSeconds;
}
