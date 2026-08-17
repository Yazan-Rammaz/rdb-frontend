import { NextRequest, NextResponse } from 'next/server';
import { NEST_BASE, COOKIES, backendFetch } from '@/lib/edgeProxy';


const isProduction = process.env.NODE_ENV === 'production';

function clearCookie(name: string, secure: boolean) {
    return `${name}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

/**
 * Logout. Revokes the session server-side (NestJS blacklists the refresh token and
 * the bound session, so the access token stops working immediately — not just at
 * its ~15-min expiry), then clears the httpOnly auth cookies.
 *
 * Per AUTH_LOGOUT_REFRESH_WEB.md §2, `/auth/logout` needs BOTH the access token
 * (Bearer) and the refresh token (body). The upstream call is best-effort: if it
 * fails (token already expired/revoked) the session lapses on its own, so we clear
 * cookies and report success regardless.
 */
export async function POST(req: NextRequest) {
    const secure = isProduction;
    const at = req.cookies.get(COOKIES.access)?.value;
    const rt = req.cookies.get(COOKIES.refresh)?.value;

    if (at && rt) {
        try {
            await backendFetch(NEST_BASE, '/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${at}`,
                },
                body: JSON.stringify({ refreshToken: rt }),
            });
        } catch {
            // Best-effort — the session will lapse on its own if this fails.
        }
    }

    const res = NextResponse.json({ success: true });

    for (const name of ['rdb_at', 'rdb_rt', 'rdb_user', 'rdb_st', 'rdb_step']) {
        res.headers.append('Set-Cookie', clearCookie(name, secure));
    }
    // Readable cookies (not httpOnly) — clear without the flag.
    for (const name of ['rdb_at_exp', 'rdb_sid']) {
        res.headers.append(
            'Set-Cookie',
            `${name}=; Path=/; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`,
        );
    }

    return res;
}
