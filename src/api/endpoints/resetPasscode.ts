import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    ResetAnswer,
    ResetAnswersResponse,
    ResetCompleteResponse,
    ResetInitResponse,
    ResetQuestionsResponse,
    ResetSendOtpResponse,
    ResetSet,
    ResetVerifyOtpResponse,
} from '../types/resetPasscode';

/**
 * Passcode reset — two parallel endpoint sets.
 *
 * `idle`  — the user is signed in and locked out of the app. Bearer is `rdb_at`.
 * `step`  — the user is mid-login with no access token yet. Bearer is the 10-min
 *           login stepToken, which the proxy rewrites from `X-Step-Token`.
 *
 * Same six operations either way, so `set` is a parameter rather than two
 * duplicated modules — the step set is the idle set under a /step prefix, which
 * is all `base()` encodes. Both reach NestJS through the /api/[...path] proxy.
 *
 * These return domain results on 4xx as well as 2xx — a wrong quiz answer is a
 * business outcome carrying `attemptsRemaining`, not a transport failure — so
 * `resetPasscodeApi` reads `error.body` rather than discarding it.
 */
/** Idle calls sit at /auth/reset-passcode/*, mid-login ones a /step deeper. */
const base = (set: ResetSet) => (set === 'step' ? '/auth/reset-passcode/step' : '/auth/reset-passcode');

export const resetPasscode = {
    /**
     * Body is documented as "none", but `{}` is sent so an empty body with a
     * JSON content-type cannot trip NestJS's body parser.
     */
    init: (set: ResetSet, o?: RequestOptions): Promise<ApiResult<ResetInitResponse>> =>
        request({ method: 'POST', path: `${base(set)}/init`, body: {}, options: o }),

    /**
     * Exists on the step set too, but is unnecessary there — the login OTP has
     * just passed — so only the idle flow calls it.
     */
    sendOtp: (
        set: ResetSet,
        body: { phoneNumber: string; channel?: string },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetSendOtpResponse>> =>
        request({ method: 'POST', path: `${base(set)}/send-otp`, body, options: o }),

    verifyOtp: (
        set: ResetSet,
        body: { phoneNumber: string; otpCode: string },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetVerifyOtpResponse>> =>
        request({ method: 'POST', path: `${base(set)}/verify-otp`, body, options: o }),

    /** GET server-side — the opcode carries no body. */
    questions: (
        set: ResetSet,
        o?: RequestOptions,
    ): Promise<ApiResult<Partial<ResetQuestionsResponse>>> =>
        request({ path: `${base(set)}/questions`, options: o }),

    answers: (
        set: ResetSet,
        body: { answers: ResetAnswer[] },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetAnswersResponse>> =>
        request({ method: 'POST', path: `${base(set)}/answers`, body, options: o }),

    /**
     * Quiz branch sends `resetToken` in the body. The face branch sends neither:
     * from an idle entry the proxy forwards the proof from the rdb_step cookie,
     * and from a mid-login entry it travels in `X-Face-Step-Token` (X-Step-Token
     * is already taken by the login stepToken → Authorization rewrite).
     */
    complete: (
        set: ResetSet,
        body: { passcode: string; resetToken?: string },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetCompleteResponse>> =>
        request({ method: 'POST', path: `${base(set)}/complete`, body, options: o }),
};
