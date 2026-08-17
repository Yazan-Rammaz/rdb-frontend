import { NextRequest, NextResponse } from 'next/server';
import { COOKIES } from '@/lib/edgeProxy';


/** Returns rdb_at for client-side use (e.g. WebSocket auth). */
export async function GET(req: NextRequest) {
    const token = req.cookies.get(COOKIES.access)?.value ?? '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ token });
}
