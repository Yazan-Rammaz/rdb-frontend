import { FetchResponse } from '@/core/types';
import { SendOtpResponse, User, VerifyOtpResponse } from '@/core/types/auth';
import { fetchServerData, processResponse } from '@/core/utils';
import { initialData } from '@/config/runtime';

/**
 * Validates the current user session.
 */
export async function verifyMe({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}): Promise<User | { error: string }> {
    try {
        const finalBaseUrl = initialData.BaseUrl || '';
        if (!finalBaseUrl) throw new Error('baseUrl is not configured for verifyMe');

        const response: FetchResponse<User> = await fetchServerData({
            method: 'GET',
            url: `/users/me`,
            token,
            authCookieName,
        });
        return processResponse<User>(response);
    } catch (error) {
        console.error('verifyMe Error:', error);
        return { error: String(error) };
    }
}

/**
 * Initiates the OTP process for Sign In.
 */
export async function savePasscode({
    passcode,
    token,
}: {
    passcode: string;
    token?: string;
}): Promise<{ success: boolean } | { error: string }> {
    try {
        const response: FetchResponse<{ success: boolean }> = await fetchServerData({
            method: 'POST',
            body: { passcode },
            url: `/auth/passcode`,
            token,
        });
        return processResponse<{ success: boolean }>(response);
    } catch (error) {
        console.error('savePasscode Error:', error);
        return { error: String(error) };
    }
}
/**
 * Verifies the user's passcode against the backend.
 */
export async function verifyPasscode({
    passcode,
    token,
}: {
    passcode: string;
    token?: string;
}): Promise<{ success: boolean } | { error: string }> {
    try {
        const response: FetchResponse<{ success: boolean }> = await fetchServerData({
            method: 'POST',
            body: { passcode },
            url: `/auth/passcode/verify`,
            token,
        });
        return processResponse<{ success: boolean }>(response);
    } catch (error) {
        console.error('verifyPasscode Error:', error);
        return { error: String(error) };
    }
}

export async function updateUserProfile(
    body: {
        firstName?: string;
        lastName?: string;
        profilePictureURL?: string;
        language?: string;
    },
    { token, authCookieName }: { token?: string; authCookieName?: string } = {},
): Promise<User | { error: string }> {
    try {
        const response: FetchResponse<User> = await fetchServerData({
            method: 'PATCH',
            url: `/users/me`,
            body,
            token,
            authCookieName,
        });
        return processResponse<User>(response);
    } catch (error) {
        console.error('updateUserProfile Error:', error);
        return { error: String(error) };
    }
}

