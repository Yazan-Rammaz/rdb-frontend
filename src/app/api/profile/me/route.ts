import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { NEST_BASE, COOKIES, backendFetch, cookieOptions, safeJson, notGateway } from '@/lib/edgeProxy';


/**
 * GET /api/profile/me — proxies NestJS /users/me with the rdb_at Bearer, refreshes
 * the rdb_user cookie (preserving the locally-tracked kycRequest), and clears auth
 * cookies on a 401/403 so a stale session doesn't linger. Ported from the Worker.
 *
 * Uses next/headers cookies() (same primitive as secure-cookies.ts) so the rdb_user
 * JSON round-trips identically to the rest of the app.
 */
export async function GET(req: NextRequest) {
    const blocked = notGateway(req);
    if (blocked) return blocked;
    const jar = await cookies();
    const token = jar.get(COOKIES.access)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let upstream: Response;
    try {
        upstream = await backendFetch(NEST_BASE, '/users/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (e) {
        console.error('[/api/profile/me] backend unreachable:', e);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }

    if (!upstream.ok) {
        if (upstream.status === 401 || upstream.status === 403) {
            for (const name of Object.values(COOKIES)) jar.delete(name);
        }
        return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }

    const data = await safeJson(upstream);
    const raw = (data.data ?? data) as Record<string, unknown>;
    const user = { ...raw, id: raw.id ?? raw._id };

    let prevKyc: unknown = null;
    const existing = jar.get(COOKIES.user)?.value;
    if (existing) {
        try {
            prevKyc = (JSON.parse(existing) as Record<string, unknown>).kycRequest;
        } catch {
            /* ignore malformed cookie */
        }
    }

    jar.set(
        COOKIES.user,
        JSON.stringify({ ...user, kycRequest: prevKyc ?? null }),
        cookieOptions(24 * 60 * 60),
    );
    return NextResponse.json(user);
}
