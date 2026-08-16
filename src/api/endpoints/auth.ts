import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    CreateQrSessionBody,
    QrSessionResponse,
    QrTokenResponse,
    RefreshQrTokenQuery,
    ResendOtpBody,
    SendOtpBody,
    SendOtpResponse,
    VerifyOtpInput,
    VerifyOtpResponse,
} from '../types/auth';

/**
 * Phone/OTP sign-in and QR desktop login.
 *
 * These are all pre-session calls, so none of them can benefit from the
 * refresh-on-401 retry — there is no token to refresh yet. They go through the
 * same client anyway for consistent error shapes.
 */
export const auth = {
    sendOtp: (body: SendOtpBody, o?: RequestOptions): Promise<ApiResult<SendOtpResponse>> =>
        request({ path: '/auth/phone/send-otp', method: 'POST', body, options: o }),

    /** Note the backend spells this "resend"; only the action was camelCased. */
    resendOtp: (body: ResendOtpBody, o?: RequestOptions): Promise<ApiResult<SendOtpResponse>> =>
        request({ path: '/auth/phone/resend-otp', method: 'POST', body, options: o }),

    /**
     * Exchanges an OTP for a session.
     *
     * The wire body is not the input shape: `type` is sent as `action`, and
     * `platform: 'web'` is added. Optional ids are omitted rather than sent as
     * undefined, matching what the action did.
     */
    verifyOtp: (input: VerifyOtpInput, o?: RequestOptions): Promise<ApiResult<VerifyOtpResponse>> =>
        request({
            path: '/auth/phone/verify',
            method: 'POST',
            body: {
                phoneNumber: input.phoneNumber,
                otpCode: input.otpCode,
                msegatId: input.msegatId,
                sessionInfo: input.sessionInfo,
                action: input.type,
                platform: 'web',
                ...(input.deviceId ? { deviceId: input.deviceId } : {}),
                ...(input.deviceInfo ? { deviceInfo: input.deviceInfo } : {}),
            },
            options: o,
        }),

    createQrSession: (
        body: CreateQrSessionBody = {},
        o?: RequestOptions,
    ): Promise<ApiResult<QrSessionResponse>> =>
        request({ path: '/auth/qr/session', method: 'POST', body, options: o }),

    /**
     * Rotates the qrToken for a live login attempt.
     *
     * A 410/404 here means the link is gone and the caller should regenerate —
     * that is expected state, not a failure, so `refreshQrToken` in
     * `api/helpers/qrLogin.ts` maps it rather than leaving every call site to
     * remember which status codes mean "expired".
     */
    refreshQrToken: (
        q: RefreshQrTokenQuery,
        o?: RequestOptions,
    ): Promise<ApiResult<QrTokenResponse>> =>
        request({ path: '/auth/qr/refresh', query: { ...q }, options: o }),
};
