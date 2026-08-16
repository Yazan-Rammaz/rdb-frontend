import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    AuthTokens,
    CurrentUser,
    LoginResponse,
    OtpSentResponse,
    QrSessionResponse,
    SendOtpBody,
    SetPasscodeBody,
    UpdateProfileBody,
    VerifyOtpBody,
    VerifyPasscodeBody,
} from '../types/auth';

/**
 * Authentication and the current user.
 *
 * Passcode calls route through the opaque gateway (`op`) so their endpoint names
 * stay out of the client bundle — a passcode endpoint is worth not advertising.
 */
export const auth = {
    me: (o?: RequestOptions): Promise<ApiResult<CurrentUser>> =>
        request({ path: '/users/me', options: o }),

    updateProfile: (body: UpdateProfileBody, o?: RequestOptions): Promise<ApiResult<CurrentUser>> =>
        request({ path: '/users/me', method: 'PATCH', body, options: o }),

    sendOtp: (body: SendOtpBody, o?: RequestOptions): Promise<ApiResult<OtpSentResponse>> =>
        request({ path: '/auth/phone/send-otp', method: 'POST', body, options: o }),

    resendOtp: (body: SendOtpBody, o?: RequestOptions): Promise<ApiResult<OtpSentResponse>> =>
        request({ path: '/auth/phone/resend-otp', method: 'POST', body, options: o }),

    verifyOtp: (body: VerifyOtpBody, o?: RequestOptions): Promise<ApiResult<LoginResponse>> =>
        request({ path: '/auth/phone/verify', method: 'POST', body, options: o }),

    setPasscode: (body: SetPasscodeBody, o?: RequestOptions): Promise<ApiResult<AuthTokens>> =>
        request({ path: '/auth/passcode', method: 'POST', body, op: 'sp', options: o }),

    verifyPasscode: (body: VerifyPasscodeBody, o?: RequestOptions): Promise<ApiResult<LoginResponse>> =>
        request({ path: '/auth/passcode/verify', method: 'POST', body, op: 'sv', options: o }),

    createQrSession: (o?: RequestOptions): Promise<ApiResult<QrSessionResponse>> =>
        request({ path: '/auth/qr/session', method: 'POST', options: o }),
};
