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
 * duplicated modules. Every call is opcode-routed (PROXY_OP_ROUTES): the
 * catch-all rewrites each op to the real NestJS path server-side, so the
 * descriptive endpoint names never appear in the Network tab.
 *
 * These return domain results on 4xx as well as 2xx — a wrong quiz answer is a
 * business outcome carrying `attemptsRemaining`, not a transport failure — so
 * `resetPasscodeApi` reads `error.body` rather than discarding it.
 */
const OPS = {
    idle: { init: 'ri', sendOtp: 'ro', verifyOtp: 'rv', questions: 'rq', answers: 'ra', complete: 'rc' },
    step: { init: 'si', sendOtp: 'so', verifyOtp: 'sw', questions: 'sq', answers: 'sn', complete: 'sp' },
} as const;

export const resetPasscode = {
    /**
     * Body is documented as "none", but `{}` is sent so an empty body with a
     * JSON content-type cannot trip NestJS's body parser.
     */
    init: (set: ResetSet, o?: RequestOptions): Promise<ApiResult<ResetInitResponse>> =>
        request({ path: '/auth/reset-passcode/init', method: 'POST', op: OPS[set].init, body: {}, options: o }),

    /**
     * Exists on the step set too, but is unnecessary there — the login OTP has
     * just passed — so only the idle flow calls it.
     */
    sendOtp: (
        set: ResetSet,
        body: { phoneNumber: string; channel?: string },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetSendOtpResponse>> =>
        request({ path: '/auth/reset-passcode/send-otp', method: 'POST', op: OPS[set].sendOtp, body, options: o }),

    verifyOtp: (
        set: ResetSet,
        body: { phoneNumber: string; otpCode: string },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetVerifyOtpResponse>> =>
        request({ path: '/auth/reset-passcode/verify-otp', method: 'POST', op: OPS[set].verifyOtp, body, options: o }),

    /** GET server-side — the opcode carries no body. */
    questions: (
        set: ResetSet,
        o?: RequestOptions,
    ): Promise<ApiResult<Partial<ResetQuestionsResponse>>> =>
        request({ path: '/auth/reset-passcode/questions', op: OPS[set].questions, options: o }),

    answers: (
        set: ResetSet,
        body: { answers: ResetAnswer[] },
        o?: RequestOptions,
    ): Promise<ApiResult<ResetAnswersResponse>> =>
        request({ path: '/auth/reset-passcode/answers', method: 'POST', op: OPS[set].answers, body, options: o }),

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
        request({ path: '/auth/reset-passcode/complete', method: 'POST', op: OPS[set].complete, body, options: o }),
};
