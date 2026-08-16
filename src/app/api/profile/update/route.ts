import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { NEST_BASE, COOKIES, backendFetch, cookieOptions, safeJson, notGateway } from '@/lib/edgeProxy';


/**
 * PATCH /api/profile/update — PATCH NestJS /users/me, then refresh the rdb_user
 * cookie from a follow-up /users/me (preserving kycRequest). Ported from the Worker.
 */
export async function PATCH(req: NextRequest) {
    const _b = notGateway(req);
    if (_b) return _b;
    const jar = await cookies();
    const token = jar.get(COOKIES.access)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.text();

    let patchRes: Response;
    try {
        patchRes = await backendFetch(NEST_BASE, '/users/me', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body,
        });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }

    const patchData = await safeJson(patchRes);
    if (!patchRes.ok) return NextResponse.json(patchData, { status: patchRes.status });

    // Best-effort cookie refresh — never gate the response on it.
    try {
        const meRes = await backendFetch(NEST_BASE, '/users/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
            const meData = await safeJson(meRes);
            const user = (meData.data ?? meData) as Record<string, unknown>;
            let prevKyc: unknown = null;
            const existing = jar.get(COOKIES.user)?.value;
            if (existing) {
                try {
                    prevKyc = (JSON.parse(existing) as Record<string, unknown>).kycRequest;
                } catch {
                    /* ignore */
                }
            }
            jar.set(
                COOKIES.user,
                JSON.stringify({ ...user, kycRequest: prevKyc ?? null }),
                cookieOptions(24 * 60 * 60),
            );
        }
    } catch {
        /* non-fatal */
    }

    return NextResponse.json(patchData, { status: patchRes.status });
}
