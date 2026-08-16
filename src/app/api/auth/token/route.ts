import { NextRequest, NextResponse } from 'next/server';
import { COOKIES, notGateway } from '@/lib/edgeProxy';


/** Returns rdb_at for client-side use (e.g. WebSocket auth). */
export async function GET(req: NextRequest) {
    const _b = notGateway(req);
    if (_b) return _b;
    const token = req.cookies.get(COOKIES.access)?.value ?? '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ token });
}
