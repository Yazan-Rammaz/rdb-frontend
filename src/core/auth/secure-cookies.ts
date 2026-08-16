// Use dynamic import to avoid a static Next.js dependency at build time
async function getCookies() {
    try {
        const { cookies } = await import('next/headers');
        return cookies();
    } catch (e) {
        return null;
    }
}
import { User, UserData } from '@/core/types/auth';

// Cookie names
const isProduction = process.env.NODE_ENV === 'production';
const ACCESS_TOKEN_COOKIE = 'rdb_at'; // Short name, less obvious
const REFRESH_TOKEN_COOKIE = 'rdb_rt';
const USER_DATA_COOKIE = 'rdb_user';

// Cookie options for secure httpOnly tokens (NOT accessible via JavaScript - prevents XSS)
const SECURE_COOKIE_OPTIONS = {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict' as const, // CSRF protection
    path: '/',
};

// Cookie options for user data (also httpOnly for full security)
const USER_COOKIE_OPTIONS = {
    httpOnly: true, // All cookies are httpOnly - fully server-side
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
};


/**
 * SERVER ACTION: Store authentication data securely
 * - Tokens go to httpOnly cookies (NOT accessible via JavaScript - XSS protection)
 * - User data (without tokens) goes to regular cookie
 *
 * Call this after successful login/verifyOtp
 */
export async function setAuthCookies(userData: UserData): Promise<{ success: boolean }> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available setAuthCookies');
            return { success: false };
        }
        // Calculate expiry from token expiry dates
        const accessTokenExpiry = userData.accessToken?.expiresAt
            ? new Date(userData.accessToken.expiresAt)
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

        const refreshTokenExpiry = userData.refreshToken?.expiresAt
            ? new Date(userData.refreshToken.expiresAt)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

        // 1. Store access token in httpOnly cookie (protected from XSS)
        if (userData.accessToken?.token) {
            cookieStore.set(ACCESS_TOKEN_COOKIE, userData.accessToken.token, {
                ...SECURE_COOKIE_OPTIONS,
                expires: accessTokenExpiry,
            });
        }

        // 2. Store refresh token in httpOnly cookie (protected from XSS)
        if (userData.refreshToken?.token) {
            cookieStore.set(REFRESH_TOKEN_COOKIE, userData.refreshToken.token, {
                ...SECURE_COOKIE_OPTIONS,
                expires: refreshTokenExpiry,
            });
        }

        // 3. Store user data WITHOUT tokens in regular cookie (visible but safe)
        const safeUserData: User = userData.user;

        cookieStore.set(USER_DATA_COOKIE, JSON.stringify(safeUserData), {
            ...USER_COOKIE_OPTIONS,
            expires: accessTokenExpiry,
        });
        console.log('Auth cookies set successfully');
        return { success: true };
    } catch (error) {
        console.log('set auth cookies Error:', error);
        return { success: false };
    }
}

/**
 * SERVER ACTION: Clear all authentication cookies
 * Call this on logout
 */
export async function clearAuthCookies(): Promise<{ success: boolean }> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available clearAuthCookies');
            return { success: false };
        }

        cookieStore.delete(ACCESS_TOKEN_COOKIE);
        cookieStore.delete(REFRESH_TOKEN_COOKIE);
        cookieStore.delete(USER_DATA_COOKIE);
        cookieStore.delete('rdb_st');
        cookieStore.delete('rdb_step');

        console.log('Auth cookies cleared successfully');
        return { success: true };
    } catch (error) {
        console.log('clear auth cookies Error:', error);
        return { success: false };
    }
}

/**
 * SERVER ONLY: Get access token from httpOnly cookie
 * Use this in server components, server actions, or API routes
 */
export async function getAccessToken(): Promise<string | null> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available getAccessToken');
            return null;
        }
        console.log(
            'Access token retrieved from cookie:',
            cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
        );
        return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
    } catch (error) {
        console.error('getAccessToken Error:', error);
        return null;
    }
}

/**
 * SERVER ONLY: Get refresh token from httpOnly cookie
 * Use this in server components, server actions, or API routes
 */
export async function getRefreshToken(): Promise<string | null> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available getRefreshToken');
            return null;
        }
        console.log(
            'Refresh token retrieved from cookie:',
            cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
        );
        return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
    } catch (error) {
        console.error('getRefreshToken Error:', error);
        return null;
    }
}

/**
 * SERVER ONLY: Get both tokens
 */
export async function getAuthTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
}> {
    const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
    console.log('Auth tokens retrieved:', { accessToken, refreshToken });
    return { accessToken, refreshToken };
}

/**
 * SERVER ONLY: Get user data from cookie
 * Can also be used on client via the client utility
 */
export async function getServerUserData(): Promise<User | null> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available getServerUserData');
            return null;
        }
        const userCookie = cookieStore.get(USER_DATA_COOKIE)?.value;

        if (userCookie) {
            return JSON.parse(userCookie) as User;
        }
        return null;
    } catch (error) {
        console.error('getServerUserData Error:', error);
        return null;
    }
}

/**
 * SERVER ONLY: Check if user is authenticated (has valid access token)
 */
export async function isAuthenticated(): Promise<boolean> {
    const token = await getAccessToken();
    console.log('Authentication check - access token exists:', !!token);
    return !!token;
}

/**
 * SERVER ACTION: Update user data cookie (without affecting tokens)
 * Use this when user profile is updated
 */
export async function updateUserDataCookie(user: User): Promise<{ success: boolean }> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available updateUserDataCookie');
            return { success: false };
        }

        // Check if user is logged in (has access token)
        const hasToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
        const expiry = hasToken
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) // Refresh for 24 more hours
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        const safeUserData: User = user;

        cookieStore.set(USER_DATA_COOKIE, JSON.stringify(safeUserData), {
            ...USER_COOKIE_OPTIONS,
            expires: expiry,
        });

        return { success: true };
    } catch (error) {
        console.error('updateUserDataCookie Error:', error);
        return { success: false };
    }
}

/**
 * SERVER ACTION: Get any cookie value by name
 * Used by RDB library to read host app cookies (authToken, local, baseUrl)
 */
export async function getCookieByName(cookieName: string): Promise<string | null> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available getCookieByName');
            return null;
        }
        return cookieStore.get(cookieName)?.value || null;
    } catch (error) {
        console.error(`getCookieByName(${cookieName}) Error:`, error);
        return null;
    }
}

/**
 * SERVER ACTION: Get multiple cookies by names
 * Returns an object with cookie names as keys and values
 */
export async function getCookiesByNames(
    cookieNames: Record<string, string>,
): Promise<Record<string, string | null>> {
    try {
        const cookieStore = await getCookies();
        if (!cookieStore) {
            console.log('Cookie store is not available getCookiesByNames');
            return {};
        }
        const result: Record<string, string | null> = {};

        for (const [key, cookieName] of Object.entries(cookieNames)) {
            result[key] = cookieStore.get(cookieName)?.value || null;
        }

        return result;
    } catch (error) {
        console.error('getCookiesByNames Error:', error);
        return {};
    }
}
