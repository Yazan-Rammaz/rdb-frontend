'use client';

/**
 * Reset-passcode API client — live NestJS backend.
 *
 * Integrated per `docs/RESET_PASSCODE_WEB_INTEGRATION.md`. A signed-in user who
 * forgot their app-lock passcode recovers it here. Every call is authenticated
 * via the session cookie (`rdb_at`), injected as `Authorization: Bearer` by the
 * Next.js `/api/...` proxy — so **no body carries a userId**.
 *
 * These endpoints **always return HTTP 200** with a JSON envelope (lockout /
 * branch / failures live in the body, not the status code) — except `complete`,
 * which may `403` on an invalid/expired/replayed proof. So we read the body.
 *
 * Branch (decided by the backend in `init`):
 *   - `stepUp.method === 'face'` → Face Re-Verify → step token in `rdb_step`
 *     cookie (the proxy forwards it as `X-Step-Token` on `complete`).
 *   - otherwise → phone → OTP → KBA quiz → `resetToken` → `complete`.
 *
 * Two entry points (doc §0.1), two endpoint sets with identical bodies:
 *   - **Idle / app-lock** (session ACTIVE): `/api/auth/reset-passcode/*`,
 *     Bearer = `rdb_at` (injected by the proxy). Export: `resetPasscodeApi`.
 *   - **Mid-login passcode step** (`status:'requires_passcode'`):
 *     `/api/auth/reset-passcode/step/*`, Bearer = the 10-min login `stepToken`
 *     (sent as `X-Step-Token`; the proxy rewrites it to `Authorization`).
 *     Export: `createStepResetPasscodeApi(stepToken)`. On the step set there is
 *     NO OTP step (the login OTP just passed) and `init` never offers face —
 *     go straight `init → questions`. A `401` on any step call means the step
 *     token expired → `StepExpiredError` → restart the login.
 */

import { api } from '@/api';
import type { ApiResult, ResetSet } from '@/api';

// ─── Contract types ──────────────────────────────────────────────────────────

export interface ResetStepUp {
    method: 'face';
    challengeId: string;
    reason?: string;
}

export interface ResetLockout {
    /** ISO timestamp when the user may try again. */
    lockedUntil: string;
    /** Hours this lockout spans (5 → 12 → 2 …), for display copy. */
    nextLockoutHours: number;
}

export interface ResetInitResponse {
    /** KYC status from the backend — decides the branch. */
    isVerified: boolean;
    /** Present when verified: the face challenge to satisfy. */
    stepUp?: ResetStepUp;
    /** Present when the user is currently locked out from prior quiz failures. */
    lockout?: ResetLockout;
}

export interface ResetSendOtpResponse {
    ok: boolean;
    sessionInfo?: string;
    error?: string;
}

export interface ResetVerifyOtpResponse {
    ok: boolean;
    error?: string;
}

export interface QuizOption {
    id: string;
    label: string;
}

export interface QuizQuestion {
    id: string;
    text: string;
    options: QuizOption[];
}

export interface ResetQuestionsResponse {
    questions: QuizQuestion[];
    attemptsRemaining: number;
}

export interface ResetAnswer {
    questionId: string;
    optionId: string;
}

export interface ResetAnswersResponse {
    success: boolean;
    /** Quiz attempts left before lockout (1 → "one attempt left" screen). */
    attemptsRemaining: number;
    /** Set when this failure triggered a lockout. */
    lockedUntil?: string;
    lockoutHours?: number;
    /** Short-lived token authorising the new-passcode set, on success. */
    resetToken?: string;
}

export interface ResetCompleteResponse {
    success: boolean;
    error?: string;
}

export interface ResetPasscodeApi {
    init(): Promise<ResetInitResponse>;
    sendOtp(phoneNumber: string, channel: 'sms' | 'whatsapp'): Promise<ResetSendOtpResponse>;
    verifyOtp(phoneNumber: string, otpCode: string): Promise<ResetVerifyOtpResponse>;
    getQuestions(): Promise<ResetQuestionsResponse>;
    submitAnswers(answers: ResetAnswer[]): Promise<ResetAnswersResponse>;
    /**
     * `passcode` is the new PIN. Exactly one proof accompanies it:
     *  - quiz branch: `resetToken` in the body;
     *  - face branch, idle entry: nothing here — the proof rides the `rdb_step`
     *    cookie (proxy forwards it as `X-Step-Token`);
     *  - face branch, mid-login entry: `faceStepToken`, sent as the
     *    `X-Face-Step-Token` header (RESET_PASSCODE_STEP_FACE_WEB_INTEGRATION.md §3).
     *    It must NOT go in the body (`stepUpToken` is ignored → 403) nor as
     *    `resetToken` (action-scope mismatch → 403).
     */
    complete(passcode: string, resetToken?: string, faceStepToken?: string): Promise<ResetCompleteResponse>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Thrown when a `step/*` call returns 401 — the 10-min login step token expired.
 * Doc §5: restart the login (new OTP) for a fresh step token, then `step/init`.
 * Quiz attempts/lockouts are durable server-side, so nothing is lost.
 */
export class StepExpiredError extends Error {
    constructor() {
        super('STEP_EXPIRED');
        this.name = 'StepExpiredError';
    }
}

function makeApi(set: ResetSet, stepToken?: string): ResetPasscodeApi {
    const isStepSet = set === 'step';
    const headers: Record<string, string> = {
        // Mid-login set: the proxy rewrites X-Step-Token → Authorization Bearer.
        // Also persisted in the rdb_step cookie, so the header is best-effort.
        ...(stepToken ? { 'X-Step-Token': stepToken } : {}),
    };

    /**
     * These endpoints answer with a domain result on 4xx as well as 2xx — a
     * wrong quiz answer is a business outcome carrying `attemptsRemaining`, not
     * a transport failure — so the error body is unwrapped rather than dropped.
     * `fallback` covers an empty or non-JSON body, exactly as readJson did.
     *
     * The one status that is NOT a domain result is a 401 on the step set: the
     * 10-min login step token expired and the flow has to restart.
     */
    const unwrap = <T>(res: ApiResult<T>, fallback: T): T => {
        if (res.ok) return res.data;
        if (isStepSet && res.error.status === 401) throw new StepExpiredError();
        return (res.error.body as T | undefined) ?? fallback;
    };

    const opts = (extraHeaders?: Record<string, string>) => ({
        headers: extraHeaders ? { ...headers, ...extraHeaders } : headers,
    });

    return {
        init: async () =>
            unwrap(await api.resetPasscode.init(set, opts()), { isVerified: false }),

        sendOtp: async (phoneNumber, channel) =>
            unwrap(await api.resetPasscode.sendOtp(set, { phoneNumber, channel }, opts()), {
                ok: false,
                error: 'Could not send the code. Please try again.',
            }),

        verifyOtp: async (phoneNumber, otpCode) =>
            unwrap(await api.resetPasscode.verifyOtp(set, { phoneNumber, otpCode }, opts()), {
                ok: false,
                error: 'Invalid code',
            }),

        getQuestions: async () => {
            const data = unwrap(await api.resetPasscode.questions(set, opts()), {});
            // 409 (OTP step not passed) or any error → empty set; the flow surfaces it.
            return {
                questions: data.questions ?? [],
                attemptsRemaining: data.attemptsRemaining ?? 0,
            };
        },

        submitAnswers: async (answers) =>
            unwrap(await api.resetPasscode.answers(set, { answers }, opts()), {
                success: false,
                attemptsRemaining: 0,
            }),

        complete: async (passcode, resetToken, faceStepToken) =>
            unwrap(
                await api.resetPasscode.complete(
                    set,
                    { passcode, resetToken },
                    opts(faceStepToken ? { 'X-Face-Step-Token': faceStepToken } : undefined),
                ),
                { success: false, error: 'Could not verify. Please try again.' },
            ),
    };
}

/** Idle / app-lock entry set (Bearer = rdb_at, injected by the proxy). */
export const resetPasscodeApi: ResetPasscodeApi = makeApi('idle');

/** Mid-login entry set (Bearer = the login stepToken). Doc §0.1 / scenarios #2 & #4. */
export function createStepResetPasscodeApi(stepToken?: string): ResetPasscodeApi {
    return makeApi('step', stepToken);
}
