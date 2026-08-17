import { NextRequest, NextResponse } from 'next/server';
import { COOKIES, cookieOptions } from '@/lib/edgeProxy';


/** Persists (or clears) a step-up token in the short-lived httpOnly rdb_step cookie. */
export async function POST(req: NextRequest) {
    const { stepToken } = (await req.json().catch(() => ({}))) as { stepToken?: string };
    const res = NextResponse.json({ success: true });

    if (stepToken) {
        res.cookies.set(COOKIES.step, stepToken, cookieOptions(10 * 60));
    } else {
        res.cookies.set(COOKIES.step, '', cookieOptions(0));
    }
    return res;
}
