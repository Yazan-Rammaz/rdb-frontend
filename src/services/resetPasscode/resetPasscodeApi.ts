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

import { apiFetchOp } from '@/core/utils';

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
 * Opcodes for the random-hash gateway (PROXY_OPS in app/api/[...path]/route.ts).
 * The catch-all rewrites each op to the real NestJS path server-side, so the
 * descriptive reset-passcode endpoint names never appear in the Network tab.
 */
const OPCODES = {
    idle: { init: 'ri', sendOtp: 'ro', verifyOtp: 'rv', questions: 'rq', answers: 'ra', complete: 'rc' },
    step: { init: 'si', sendOtp: 'so', verifyOtp: 'sw', questions: 'sq', answers: 'sn', complete: 'sp' },
} as const;

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

/** Parse a JSON body, falling back to a safe default on empty/non-JSON. */
async function readJson<T>(res: Response, fallback: T): Promise<T> {
    return (await res.json().catch(() => fallback)) as T;
}

function makeApi(set: keyof typeof OPCODES, stepToken?: string): ResetPasscodeApi {
    const ops = OPCODES[set];
    const isStepSet = set === 'step';
    const headers: Record<string, string> = {
        // Mid-login set: the proxy rewrites X-Step-Token → Authorization Bearer.
        // Also persisted in the rdb_step cookie, so the header is best-effort.
        ...(stepToken ? { 'X-Step-Token': stepToken } : {}),
    };

    const guard = (res: Response): Response => {
        if (isStepSet && res.status === 401) throw new StepExpiredError();
        return res;
    };

    const call = async <T>(
        o: string,
        body: unknown,
        fallback: T,
        extraHeaders?: Record<string, string>,
    ): Promise<T> => {
        const res = guard(
            await apiFetchOp(o, body, {
                headers: extraHeaders ? { ...headers, ...extraHeaders } : headers,
            }),
        );
        return readJson<T>(res, fallback);
    };

    return {
        // Body is documented as "none", but we send {} so an empty body with a JSON
        // content-type can't trip NestJS's body parser.
        init: () => call<ResetInitResponse>(ops.init, {}, { isVerified: false }),

        // OTP endpoints exist on the step set too but are unnecessary there (the
        // login OTP just passed) — only the idle flow calls them.
        sendOtp: (phoneNumber, channel) =>
            call<ResetSendOtpResponse>(
                ops.sendOtp,
                { phoneNumber, channel },
                { ok: false, error: 'Could not send the code. Please try again.' },
            ),

        verifyOtp: (phoneNumber, otpCode) =>
            call<ResetVerifyOtpResponse>(
                ops.verifyOtp,
                { phoneNumber, otpCode },
                { ok: false, error: 'Invalid code' },
            ),

        getQuestions: async () => {
            // GET server-side — the op carries no body (the catch-all rewrites it).
            const res = guard(await apiFetchOp(ops.questions, undefined, { headers }));
            const data = await readJson<Partial<ResetQuestionsResponse>>(res, {});
            // 409 (OTP step not passed) or any error → empty set; the flow surfaces it.
            return {
                questions: data.questions ?? [],
                attemptsRemaining: data.attemptsRemaining ?? 0,
            };
        },

        submitAnswers: (answers) =>
            call<ResetAnswersResponse>(
                ops.answers,
                { answers },
                { success: false, attemptsRemaining: 0 },
            ),

        // Quiz branch: resetToken in the body. Face branch, idle entry: neither —
        // the proxy forwards the proof from the rdb_step cookie as X-Step-Token.
        // Face branch, mid-login entry: the proof travels in X-Face-Step-Token
        // (X-Step-Token is taken by the login stepToken → Authorization rewrite).
        complete: (passcode, resetToken, faceStepToken) =>
            call<ResetCompleteResponse>(
                ops.complete,
                { passcode, resetToken },
                { success: false, error: 'Could not verify. Please try again.' },
                faceStepToken ? { 'X-Face-Step-Token': faceStepToken } : undefined,
            ),
    };
}

/** Idle / app-lock entry set (Bearer = rdb_at, injected by the proxy). */
export const resetPasscodeApi: ResetPasscodeApi = makeApi('idle');

/** Mid-login entry set (Bearer = the login stepToken). Doc §0.1 / scenarios #2 & #4. */
export function createStepResetPasscodeApi(stepToken?: string): ResetPasscodeApi {
    return makeApi('step', stepToken);
}
