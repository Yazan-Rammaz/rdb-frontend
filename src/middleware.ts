import { NextRequest, NextResponse } from 'next/server';

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

    if (pathname === '/auth' && hasToken) {
        const url = request.nextUrl.clone();
        url.pathname = '/home';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/home/:path*', '/addresses/:path*', '/settings/:path*', '/transactions/:path*', '/verification/:path*', '/auth'],
};
