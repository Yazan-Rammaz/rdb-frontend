import { NextRequest, NextResponse } from 'next/server';
import { NEST_BASE, backendFetch, safeJson, maxAgeFromExpiry, notGateway } from '@/lib/edgeProxy';


const isProduction = process.env.NODE_ENV === 'production';

function cookieOpts(maxAge: number, secure: boolean) {
    return `HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/**
 * Exchanges a NestJS sessionToken for accessToken/refreshToken/user and mints the
 * httpOnly auth cookies. Formerly delegated to the Worker; now calls NestJS directly
 * and sets the cookies here (the Pages Function can do both).
 */
export async function POST(req: NextRequest) {
    const _b = notGateway(req);
    if (_b) return _b;
    const body = await req.text();

    let upstream: Response;
    try {
        upstream = await backendFetch(NEST_BASE, '/auth/session/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }

    const data = await safeJson(upstream);
    const res = NextResponse.json(data, { status: upstream.status });

    if (upstream.ok) {
        const secure = isProduction;
        const accessToken = data?.accessToken as Record<string, unknown> | undefined;
        const refreshToken = data?.refreshToken as Record<string, unknown> | undefined;
        const at = accessToken?.token as string | undefined;
        const rt = refreshToken?.token as string | undefined;
        const user = data?.user;

        // Access tokens are ~5 min, refresh tokens ~30 days. Track the real expiry so
        // the cookie can't outlive the JWT inside it (which would 401 with no recovery).
        const atMaxAge = maxAgeFromExpiry(accessToken?.expiresAt, 5 * 60);
        const rtMaxAge = maxAgeFromExpiry(refreshToken?.expiresAt, 30 * 24 * 60 * 60);

        if (at) res.headers.append('Set-Cookie', `rdb_at=${at}; ${cookieOpts(atMaxAge, secure)}`);
        if (rt) res.headers.append('Set-Cookie', `rdb_rt=${rt}; ${cookieOpts(rtMaxAge, secure)}`);
        // Readable (non-httpOnly) access-token expiry for client-side proactive refresh.
        const atExpMs = Date.parse((accessToken?.expiresAt as string) ?? '');
        if (!Number.isNaN(atExpMs)) {
            res.headers.append(
                'Set-Cookie',
                `rdb_at_exp=${atExpMs}; Path=/; SameSite=Strict; Max-Age=${rtMaxAge}${secure ? '; Secure' : ''}`,
            );
        }
        if (user) {
            const userJson = encodeURIComponent(JSON.stringify(user));
            // User cookie lives as long as the session can be refreshed (refresh-token life)
            // so the app can render the user while the access token silently rotates.
            res.headers.append('Set-Cookie', `rdb_user=${userJson}; ${cookieOpts(rtMaxAge, secure)}`);
        }
        // Readable (non-httpOnly) session id so the client can tell THIS session apart
        // from a newer login: on `session:revoked_by_new_login` (broadcast to every
        // socket the user holds) only the session matching `revokedSessionId` reacts.
        const sessionId = data?.sessionId as string | undefined;
        if (sessionId) {
            res.headers.append(
                'Set-Cookie',
                `rdb_sid=${encodeURIComponent(sessionId)}; Path=/; SameSite=Strict; Max-Age=${rtMaxAge}${secure ? '; Secure' : ''}`,
            );
        }
        // Clear the step cookie — login is complete.
        res.headers.append('Set-Cookie', `rdb_step=; ${cookieOpts(0, secure)}`);
    }

    return res;
}
