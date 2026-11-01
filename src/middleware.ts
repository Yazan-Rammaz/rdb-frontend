import { NextRequest, NextResponse } from 'next/server';
import { AUTH_FLOW_COOKIE } from '@/lib/authFlowState';

const PROTECTED_PATHS = ['/home', '/addresses', '/settings', '/transactions', '/verification'];
const ACCESS_TOKEN_COOKIE = 'rdb_at';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

    const isProtected = PROTECTED_PATHS.some(
        (path) => pathname === path || pathname.startsWith(path + '/'),
    );

    if (isProtected && !hasToken) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth';
        return NextResponse.redirect(url);
    }

    // A login still in progress (name / passcode after the OTP already minted
    // the session) must be able to reload /auth and carry on; the page itself
    // sends a signed-in user with no step left to /home.
    if (pathname === '/auth' && hasToken && !request.cookies.has(AUTH_FLOW_COOKIE)) {
        const url = request.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/home/:path*', '/addresses/:path*', '/settings/:path*', '/transactions/:path*', '/verification/:path*', '/auth'],
};
