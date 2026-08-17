import { NextRequest, NextResponse } from 'next/server';
import { COOKIES, cookieOptions } from '@/lib/edgeProxy';


/** Persists (or clears) the NestJS sessionToken in the httpOnly rdb_st cookie. */
export async function POST(req: NextRequest) {
    const { sessionToken } = (await req.json().catch(() => ({}))) as { sessionToken?: string };
    const res = NextResponse.json({ success: true });

    if (sessionToken) {
        res.cookies.set(COOKIES.session, sessionToken, cookieOptions(24 * 60 * 60));
    } else {
        res.cookies.set(COOKIES.session, '', cookieOptions(0));
    }
    return res;
}
