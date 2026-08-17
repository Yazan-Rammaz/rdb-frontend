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
        request({ method: 'POST', path: '/auth/session-complete', body, options: o }),

    saveSessionToken: (body: SessionTokenBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', path: '/auth/save-session-token', body, options: o }),

    /** Pass an empty string to clear the step cookie. */
    saveStepToken: (body: StepTokenBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', path: '/auth/save-step-token', body, options: o }),

    logout: (o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', path: '/auth/logout', options: o }),

    /** Short-lived token for the WebSocket handshake, which cannot send cookies. */
    wsToken: (o?: RequestOptions): Promise<ApiResult<WsTokenResponse>> =>
        request({ path: '/auth/token', options: o }),

    // ─── Passcode ────────────────────────────────────────────────────────────

    passcodeStatus: (o?: RequestOptions): Promise<ApiResult<PasscodeStatusResponse>> =>
        request({ path: '/sessions/passcode/status', options: o }),

    setPasscode: (body: PasscodeBody, o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'POST', path: '/sessions/passcode/set', body, options: o }),

    /**
     * A wrong passcode is a 200 with `{ valid: false }`, not an error status —
     * check `res.data.valid`, not just `res.ok`.
     */
    verifyPasscode: (
        body: PasscodeBody,
        o?: RequestOptions,
    ): Promise<ApiResult<PasscodeVerifyResponse>> =>
        request({ method: 'POST', path: '/sessions/passcode/verify', body, options: o }),

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
            path: '/sessions/step/passcode/verify',
            body,
            options: o,
        }),

    /** Polled while a login waits for approval from the phone app. */
    stepApproval: (id: string, o?: RequestOptions): Promise<ApiResult<StepApprovalResponse>> =>
        request({
            // Encoded, so an id containing a slash cannot alter the path.
            path: `/sessions/step/approval/${encodeURIComponent(id)}`,
            options: o,
        }),

    // ─── Passkey / WebAuthn ──────────────────────────────────────────────────

    passkeyList: (o?: RequestOptions): Promise<ApiResult<PasskeyListResponse>> =>
        request({ path: '/sessions/passkey/list', options: o }),

    passkeyRegisterOptions: (o?: RequestOptions): Promise<ApiResult<PasskeyRegisterOptions>> =>
        request({
            method: 'POST',
            path: '/sessions/passkey/register-options',
            body: {},
            options: o,
        }),

    passkeyRegister: (
        body: PasskeyRegisterBody,
        o?: RequestOptions,
    ): Promise<ApiResult<Record<string, any>>> =>
        request({ method: 'POST', path: '/sessions/passkey/register', body, options: o }),

    passkeyAuthOptions: (o?: RequestOptions): Promise<ApiResult<PasskeyAuthOptions>> =>
        request({
            method: 'POST',
            path: '/sessions/passkey/auth-options',
            body: {},
            options: o,
        }),

    passkeyVerify: (
        body: PasskeyVerifyBody,
        o?: RequestOptions,
    ): Promise<ApiResult<PasskeyVerifyResponse>> =>
        request({ method: 'POST', path: '/sessions/passkey/verify', body, options: o }),

    /** Revokes the current session server-side. */
    deleteCurrent: (o?: RequestOptions): Promise<ApiResult<unknown>> =>
        request({ method: 'DELETE', path: '/sessions/current', options: o }),
};
