/**
 * Request bodies and responses for `endpoints/session.ts`.
 *
 * Everything here is opcode-routed. The underlying handlers live in
 * `app/api/auth/*` and `app/api/sessions/*`, and most of them read or write
 * httpOnly cookies (`rdb_at`, `rdb_st`, `rdb_step`) — which is why they are
 * local route handlers rather than a straight NestJS proxy.
 *
 * The cookie writes are the reason several of these return nothing useful: the
 * meaningful effect is a Set-Cookie header, not a body.
 */

import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
// Re-exported, not redeclared — core/types/auth.ts owns the session model.
import type { UserData } from '@/core/types/auth';
export type { UserData };

/**
 * WebAuthn ceremony options, passed straight to @simplewebauthn/browser.
 * Typed with the library's own shapes rather than Record<string, any>: these
 * used to arrive as `any` off res.json(), so a malformed options payload only
 * surfaced as a browser-level WebAuthn failure.
 */
export type PasskeyRegisterOptions = PublicKeyCredentialCreationOptionsJSON;
export type PasskeyAuthOptions = PublicKeyCredentialRequestOptionsJSON;

// ─── Requests ────────────────────────────────────────────────────────────────

export interface PasscodeBody {
    passcode: string;
}

export interface SessionTokenBody {
    sessionToken: string;
}

/** An empty `stepToken` clears the rdb_step cookie — that is how a step is cancelled. */
export interface StepTokenBody {
    stepToken: string;
}

export interface PasskeyRegisterBody {
    registrationResponse: unknown;
}

export interface PasskeyVerifyBody {
    authenticationResponse: unknown;
}

// ─── Responses ───────────────────────────────────────────────────────────────

/**
 * NestJS is inconsistent here: some deployments answer `{ enabled }` and others
 * wrap it as `{ data: { enabled } }`. Both are modelled so callers do not have
 * to guess — `passcodeEnabled()` in `api/helpers/session.ts` reads either.
 */
export interface PasscodeStatusResponse {
    enabled?: boolean;
    data?: { enabled?: boolean };
}

/** Same wrapped-or-bare inconsistency as PasscodeStatusResponse. */
export type PasskeyListResponse = unknown[] | { data?: unknown[] };

/** `{ valid: false }` is a *wrong passcode*, not a failed request — it arrives as 200. */
export interface PasscodeVerifyResponse {
    valid?: boolean;
    message?: string;
}

/**
 * Step verify answers with the login result on success (a LoginApiResponse) and
 * with `valid: false` on a wrong passcode. `failedAttempts` drives the
 * remaining-attempts counter in the UI and can arrive on either.
 */
export interface StepPasscodeVerifyResponse {
    valid?: boolean;
    failedAttempts?: number;
    [key: string]: unknown;
}

export interface PasskeyVerifyResponse {
    valid?: boolean;
}

/**
 * Exchanging a sessionToken yields the full session: accessToken, refreshToken
 * and user, which go straight to `saveAuthCookies`. A fresh `sessionToken` may
 * come back too, to be persisted as the rdb_st cookie.
 */
export type SessionCompleteResponse = UserData & { sessionToken?: string };

/** WebSocket access token, minted from the httpOnly access-token cookie. */
export interface WsTokenResponse {
    token?: string;
    [key: string]: unknown;
}

/**
 * Polled while a login waits on approval from the phone app. `status` drives the
 * poll loop; on success the rest of the body is a LoginApiResponse.
 */
export interface StepApprovalResponse {
    status?: 'pending' | 'approved' | 'rejected' | 'expired' | 'active';
    sessionToken?: string;
    [key: string]: unknown;
}
