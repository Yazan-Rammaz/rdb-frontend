import { NextRequest, NextResponse } from 'next/server';
import { NEST_BASE, COOKIES, backendFetch, safeJson, maxAgeFromExpiry, notGateway } from '@/lib/edgeProxy';


const isProduction = process.env.NODE_ENV === 'production';

function cookieOpts(maxAge: number, secure: boolean) {
    return `HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/**
 * Silent token refresh. Reads the httpOnly `rdb_rt` cookie, calls NestJS
 * `POST /auth/refresh` with it as the body credential (no Authorization header),
 * and rotates the `rdb_at`/`rdb_rt` cookies from the response.
 *
 * Rotation + reuse-detection contract (AUTH_LOGOUT_REFRESH_WEB.md §1):
 *  - Every refresh returns a NEW access AND refresh token; the sent one is now dead.
 *  - Sending an already-rotated refresh token makes the server revoke the whole
 *    session. The client serializes refreshes (single-flight + Web Locks) so two
 *    calls never race with the same token.
 *
 * On any failure (no cookie, 401, backend down) we clear the auth cookies and
 * return 401 so the client performs a hard logout.
 */
export async function POST(req: NextRequest) {
    const _b = notGateway(req);
    if (_b) return _b;
    const secure = isProduction;
    const rt = req.cookies.get(COOKIES.refresh)?.value;

    // `reason` is for diagnostics only (no secrets) — visible in the Network tab
    // and in Pages/dev logs, so a 401 here is explainable instead of opaque.
    const unauthorized = (reason: string) => {
        console.warn(`[auth/refresh] 401 — ${reason}`);
        const res = NextResponse.json({ error: 'UNAUTHENTICATED', reason }, { status: 401 });
        for (const name of [COOKIES.access, COOKIES.refresh, COOKIES.user]) {
            res.headers.append('Set-Cookie', `${name}=; ${cookieOpts(0, secure)}`);
        }
        // Readable expiry cookie isn't httpOnly — clear it without the flag.
        res.headers.append(
            'Set-Cookie',
            `${COOKIES.accessExp}=; Path=/; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`,
        );
        return res;
    };

    // No refresh cookie = there was never a session to tear down, so answer 401
    // WITHOUT the clearing Set-Cookie headers. Clearing here is not just useless,
    // it's harmful: the /auth bootstrap fires me→refresh before login, and if that
    // 401 lands after session/complete has minted rdb_at/rdb_rt/rdb_user it wipes
    // the brand-new session. The middleware then 307s /home back to /auth while
    // in-memory userData says "logged in" — the frozen passcode screen.
    if (!rt) {
        console.warn('[auth/refresh] 401 — no_refresh_token_cookie (cookies left untouched)');
        return NextResponse.json(
            { error: 'UNAUTHENTICATED', reason: 'no_refresh_token_cookie' },
            { status: 401 },
        );
    }

    let upstream: Response;
    try {
        upstream = await backendFetch(NEST_BASE, '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
        });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }

    // Non-2xx = expired / reused / revoked / endpoint missing → hard logout. Surface
    // the upstream status + a snippet so we can tell a dead token from a 404/500.
    if (!upstream.ok) {
        const snippet = await upstream.text().catch(() => '');
        return unauthorized(`upstream_${upstream.status}: ${snippet.slice(0, 200)}`);
    }

    const data = await safeJson(upstream);
    const accessToken = data?.accessToken as Record<string, unknown> | undefined;
    const refreshToken = data?.refreshToken as Record<string, unknown> | undefined;
    const at = accessToken?.token as string | undefined;
    const newRt = refreshToken?.token as string | undefined;

    // A 200 without a fresh pair is unusable — treat as a failed refresh.
    if (!at || !newRt) return unauthorized(`upstream_200_unexpected_shape: ${JSON.stringify(data).slice(0, 200)}`);

    const atExpMs = Date.parse((accessToken?.expiresAt as string) ?? '');
    const res = NextResponse.json(
        { success: true, expiresAt: accessToken?.expiresAt ?? null },
        { status: 200 },
    );
    const atMaxAge = maxAgeFromExpiry(accessToken?.expiresAt, 5 * 60);
    const rtMaxAge = maxAgeFromExpiry(refreshToken?.expiresAt, 30 * 24 * 60 * 60);

    res.headers.append('Set-Cookie', `rdb_at=${at}; ${cookieOpts(atMaxAge, secure)}`);
    res.headers.append('Set-Cookie', `rdb_rt=${newRt}; ${cookieOpts(rtMaxAge, secure)}`);
    // Readable (non-httpOnly) expiry for client-side proactive refresh scheduling.
    if (!Number.isNaN(atExpMs)) {
        res.headers.append(
            'Set-Cookie',
            `rdb_at_exp=${atExpMs}; Path=/; SameSite=Strict; Max-Age=${rtMaxAge}${secure ? '; Secure' : ''}`,
        );
    }
    return res;
}
