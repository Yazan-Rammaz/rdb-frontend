import { FetchResponse } from '@/core/types';
import { SendOtpResponse, User, VerifyOtpResponse } from '@/core/types/auth';
import { fetchServerData, processResponse } from '@/core/utils';
import { initialData } from '@/rdb/types/RDBProps';

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
export async function sendOtp({
    phoneNumber,
    channel,
    email,
    type = 'signIn',
}: {
    phoneNumber: string;
    channel: 'sms' | 'whatsapp';
    email?: string;
    type?: string;
}): Promise<SendOtpResponse | { error: string }> {
    try {
        const response: FetchResponse<SendOtpResponse> = await fetchServerData({
            method: 'POST',
            body: { phoneNumber, channel, email },
            url: `/auth/phone/send-otp`,
        });
        return processResponse<SendOtpResponse>(response);
    } catch (error) {
        console.error('sendOtp Error:', error);
        return { error: String(error) };
    }
}

/**
 * Retries sending the OTP code.
 */
export async function reSendOtp({
    phoneNumber,
    channel,
    type = 'signIn',
}: {
    phoneNumber: string;
    channel: 'sms' | 'whatsapp';
    type?: string;
}): Promise<SendOtpResponse | { error: string }> {
    try {
        const response: FetchResponse<SendOtpResponse> = await fetchServerData({
            method: 'POST',
            body: { phoneNumber, channel },
            url: `/auth/phone/resend-otp`,
        });
        return processResponse<SendOtpResponse>(response);
    } catch (error) {
        console.error('reSendOtp Error:', error);
        return { error: String(error) };
    }
}

/**
 * Saves the user's passcode to the backend.
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

/** QR web-login session: shape returned by POST /auth/qr/session. */
export interface QrSessionResponse {
    linkId: string;
    qrToken: string;
    subscribeSecret: string;
    expiresAt?: string;
    refreshIntervalMs?: number;
}

/** Result of a qrToken rotation. `expired` ⇒ the whole link is gone → regenerate. */
export type QrRefreshResult =
    | { qrToken: string; expiresAt?: string }
    | { expired: true }
    | { error: string };

/**
 * Creates a QR web-login attempt. Same transport as sendOtp/verifyOtp
 * (fetchServerData → /api proxy), so it follows the app's single API path.
 */
export async function createQrSession({
    deviceInfo,
}: { deviceInfo?: Record<string, string> } = {}): Promise<QrSessionResponse | { error: string }> {
    try {
        const response: FetchResponse<QrSessionResponse> = await fetchServerData({
            method: 'POST',
            body: { deviceInfo },
            url: `/auth/qr/session`,
        });
        return processResponse<QrSessionResponse>(response);
    } catch (error) {
        console.error('createQrSession Error:', error);
        return { error: String(error) };
    }
}

/**
 * Rotates the qrToken for a live attempt. Returns `{ expired: true }` on a
 * 410/404 (link gone → caller regenerates), the fresh token on success, or
 * `{ error }` on any other failure.
 */
export async function refreshQrToken({
    linkId,
    subscribeSecret,
}: {
    linkId: string;
    subscribeSecret: string;
}): Promise<QrRefreshResult> {
    try {
        const response: FetchResponse<{ qrToken: string; expiresAt?: string }> & {
            status: number;
        } = await fetchServerData({
            method: 'GET',
            url:
                `/auth/qr/refresh?linkId=${encodeURIComponent(linkId)}` +
                `&subscribeSecret=${encodeURIComponent(subscribeSecret)}`,
        });
        if (response.status === 410 || response.status === 404) return { expired: true };
        if (!response.success || !response.data?.qrToken) {
            return { error: response.error || 'refresh failed' };
        }
        return { qrToken: response.data.qrToken, expiresAt: response.data.expiresAt };
    } catch (error) {
        console.error('refreshQrToken Error:', error);
        return { error: String(error) };
    }
}

export async function verifyOtp({
    phoneNumber,
    otpCode,
    msegatId,
    sessionInfo,
    type = 'signIn',
    deviceId,
    deviceInfo,
}: {
    phoneNumber: string;
    otpCode: string;
    msegatId?: number | string;
    sessionInfo?: string;
    type: 'signIn' | 'signUp';
    deviceId?: string;
    deviceInfo?: Record<string, string>;
}): Promise<VerifyOtpResponse | { error: string }> {
    try {
        const body = {
            phoneNumber,
            otpCode,
            msegatId,
            sessionInfo,
            action: type,
            platform: 'web',
            ...(deviceId ? { deviceId } : {}),
            ...(deviceInfo ? { deviceInfo } : {}),
        };

        const response: FetchResponse<VerifyOtpResponse> = await fetchServerData({
            method: 'POST',
            body,
            url: '/auth/phone/verify',
        });
        return processResponse<VerifyOtpResponse>(response);
    } catch (error) {
        console.error('verifyOtp Error:', error);
        return { error: String(error) };
    }
}
