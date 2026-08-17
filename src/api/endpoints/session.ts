import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    PasscodeBody,
    PasskeyAuthOptions,
    PasskeyRegisterOptions,
    PasscodeStatusResponse,
    PasscodeVerifyResponse,
    PasskeyListResponse,
    PasskeyRegisterBody,
    PasskeyVerifyBody,
    PasskeyVerifyResponse,
    SessionCompleteResponse,
    SessionTokenBody,
    StepApprovalResponse,
    StepPasscodeVerifyResponse,
    StepTokenBody,
    WsTokenResponse,
} from '../types/session';

/**
 * Session lifecycle: cookie handoffs, passcode, passkey/WebAuthn, and the
 * mid-login step endpoints.
 *
 * All opcode-routed. Several of these exist purely to write an httpOnly cookie
 * server-side, so their result is `{}` and only `ok` matters.
 *
 * ─── Not here: token refresh ────────────────────────────────────────────────
 * The 'rf' opcode stays in `core/utils.ts`. It is the primitive this client's
 * own refresh-on-401 is built from — routing it through the client would mean a
 * failed refresh triggering another refresh.
 */
export const session = {
    // ─── Cookie handoffs ─────────────────────────────────────────────────────

    /** Exchanges a sessionToken for the auth cookies. */
    complete: (
        body: SessionTokenBody,
        o?: RequestOptions,
    ): Promise<ApiResult<SessionCompleteResponse>> =>
        request({ method: 'POST', op: 'sc', body, options: o }),

    saveSessionToken: (body: SessionTokenBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', op: 'ss', body, options: o }),

    /** Pass an empty string to clear the step cookie. */
    saveStepToken: (body: StepTokenBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', op: 'st', body, options: o }),

    logout: (o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', op: 'lo', options: o }),

    /** Short-lived token for the WebSocket handshake, which cannot send cookies. */
    wsToken: (o?: RequestOptions): Promise<ApiResult<WsTokenResponse>> =>
        request({ op: 'tk', options: o }),

    // ─── Passcode ────────────────────────────────────────────────────────────

    passcodeStatus: (o?: RequestOptions): Promise<ApiResult<PasscodeStatusResponse>> =>
        request({ op: 'ps', options: o }),

    setPasscode: (body: PasscodeBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', op: 'pc', body, options: o }),

    /**
     * A wrong passcode is a 200 with `{ valid: false }`, not an error status —
     * check `res.data.valid`, not just `res.ok`.
     */
    verifyPasscode: (
        body: PasscodeBody,
        o?: RequestOptions,
    ): Promise<ApiResult<PasscodeVerifyResponse>> =>
        request({ method: 'POST', op: 'pv', body, options: o }),

    // ─── Mid-login step ──────────────────────────────────────────────────────

    /**
     * Verifies the passcode against the login stepToken rather than a session.
     * Callers pass it via the `X-Step-Token` header (options.headers).
     *
     * A 401 means the step token expired, not a wrong passcode. The handler
     * distinguishes them with `error: 'STEP_TOKEN_MISSING'` / `'NO_SESSION'`,
     * surfaced as `ApiError.code`.
     */
    verifyStepPasscode: (
        body: PasscodeBody,
        o?: RequestOptions,
    ): Promise<ApiResult<StepPasscodeVerifyResponse>> =>
        request({
            method: 'POST',
            op: 'sv',
            body,
            options: o,
        }),

    /** Polled while a login waits for approval from the phone app. */
    stepApproval: (id: string, o?: RequestOptions): Promise<ApiResult<StepApprovalResponse>> =>
        request({ op: 'sa', body: { id }, options: o }),

    // ─── Passkey / WebAuthn ──────────────────────────────────────────────────

    passkeyList: (o?: RequestOptions): Promise<ApiResult<PasskeyListResponse>> =>
        request({ op: 'kl', options: o }),

    passkeyRegisterOptions: (o?: RequestOptions): Promise<ApiResult<PasskeyRegisterOptions>> =>
        request({
            method: 'POST',
            op: 'ko',
            body: {},
            options: o,
        }),

    passkeyRegister: (
        body: PasskeyRegisterBody,
        o?: RequestOptions,
    ): Promise<ApiResult<Record<string, any>>> =>
        request({ method: 'POST', op: 'kr', body, options: o }),

    passkeyAuthOptions: (o?: RequestOptions): Promise<ApiResult<PasskeyAuthOptions>> =>
        request({
            method: 'POST',
            op: 'ka',
            body: {},
            options: o,
        }),

    passkeyVerify: (
        body: PasskeyVerifyBody,
        o?: RequestOptions,
    ): Promise<ApiResult<PasskeyVerifyResponse>> =>
        request({ method: 'POST', op: 'kv', body, options: o }),

    /** Revokes the current session server-side. */
    deleteCurrent: (o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'DELETE', op: 'dc', options: o }),
};
