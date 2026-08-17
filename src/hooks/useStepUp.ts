'use client';

import { useCallback } from 'react';
import { useFaceReverify } from '@/context/FaceReverifyContext';
import type { StepUpRequirement } from '@/core/types/api';
import { api } from '@/api';

/**
 * Detect a step-up requirement on a gated-action response.
 *
 * NestJS signals "needs step-up" by returning (with HTTP 200) either a `stepUp`
 * object or the boolean convenience flags `requireFaceVerification` /
 * `requireOtpVerification` alongside a `challengeId`. Returns the normalised
 * requirement, or null when none is present.
 */
export function extractStepUp(result: unknown): StepUpRequirement | null {
    if (!result || typeof result !== 'object') return null;
    const r = result as {
        stepUp?: StepUpRequirement;
        requireFaceVerification?: boolean;
        requireOtpVerification?: boolean;
        challengeId?: string;
        reason?: string;
    };
    if (r.stepUp && r.stepUp.challengeId) return r.stepUp;
    if (r.requireFaceVerification && r.challengeId) {
        return { method: 'face', challengeId: r.challengeId, reason: r.reason };
    }
    if (r.requireOtpVerification && r.challengeId) {
        return { method: 'otp', challengeId: r.challengeId, reason: r.reason };
    }
    return null;
}

/** Result of running a step-up challenge without persisting the proof. */
export interface StepUpOutcome {
    ok: boolean;
    /** Single-use step-up proof minted on success (consumed by the gated action). */
    stepToken?: string;
}

/**
 * Runs the step-up challenge for a requirement.
 *
 * Two flavours:
 *  - `runStepUp` returns the raw proof WITHOUT touching the `rdb_step` cookie.
 *    Needed by the mid-login reset-passcode flow, where `rdb_step` holds the
 *    LOGIN session stepToken — overwriting it would corrupt the login step.
 *    The caller delivers the proof explicitly (X-Face-Step-Token on complete).
 *  - `satisfyStepUp` (existing contract) persists the proof into the
 *    short-lived `rdb_step` cookie so the retried action carries it (the API
 *    proxy forwards it as `X-Step-Token`). Returns true when the caller should
 *    retry the gated action.
 *
 * Only the `face` method is handled here; `otp` is left for the OTP flow.
 */
export function useStepUp() {
    const { requestFaceReverify } = useFaceReverify();

    const runStepUp = useCallback(
        async (req: StepUpRequirement): Promise<StepUpOutcome> => {
            if (req.method !== 'face') return { ok: false };
            const outcome = await requestFaceReverify({ challengeId: req.challengeId, reason: req.reason });
            if (!outcome.ok) return { ok: false };
            return { ok: true, stepToken: outcome.stepToken };
        },
        [requestFaceReverify],
    );

    const satisfyStepUp = useCallback(
        async (req: StepUpRequirement): Promise<boolean> => {
            const outcome = await runStepUp(req);
            if (!outcome.ok) return false;
            // stepToken is optional on the outcome; the handler treats a falsy
            // value as 'clear the cookie', which is what undefined did before.
            await api.session.saveStepToken({ stepToken: outcome.stepToken ?? '' });
            return true;
        },
        [runStepUp],
    );

    return { satisfyStepUp, runStepUp };
}
