'use client';

import React, { useCallback, useRef } from 'react';
import { FaceLivenessScreen } from '@/features/kyc/components/screens/FaceLivenessScreen';
import { createKycService } from '@/features/kyc/services';
import type { FaceReverifyOutcome } from '@/context/FaceReverifyContext';

type FailReason = Exclude<FaceReverifyOutcome, { ok: true }>['reason'];

interface FaceVerifyFlowProps {
    challengeId: string;
    reason?: string;
    /** Settled exactly once when the user passes, gives up, or cancels. */
    onResult: (outcome: FaceReverifyOutcome) => void;
}

/**
 * Face step-up ("Face ID") — AWS Rekognition Face Liveness, as on root.
 *
 * This used to capture ONE still and post it as `liveFaceImageData`. That path
 * runs CompareFaces on a picture the browser chose, which answers "same face"
 * and nothing about whether a person was there — a photo of the account holder
 * on a second phone passes it. Now:
 *
 *   POST /reverify/start        → an AWS liveness session, gated on the challenge
 *   GET  /reverify/credentials  → 15-minute STS creds for that one stream
 *   (the camera streams to AWS; AWS judges liveness)
 *   POST /reverify/verify { challengeId, sessionId }
 *        → the Worker fetches the judged face FROM AWS, compares it to the
 *          enrolled selfie, and commits a signed result to NestJS
 *
 * The browser never sends an image, so nothing it is made to send can decide
 * who is compared. NestJS still makes the pass/fail decision and mints the
 * stepToken — rdb's backend sees exactly the commit it always has.
 *
 * Same props and outcomes as before, so the overlay, `/face-verify` and the
 * reset-passcode flow are unchanged callers.
 */
export default function FaceVerifyFlow({ challengeId, reason, onResult }: FaceVerifyFlowProps) {
    const settledRef = useRef(false);
    const stepTokenRef = useRef<string | null>(null);
    const lastFailRef = useRef<FailReason>('error');

    const settle = useCallback(
        (outcome: FaceReverifyOutcome) => {
            if (settledRef.current) return;
            settledRef.current = true;
            onResult(outcome);
        },
        [onResult],
    );

    /**
     * The stream is finished — let the Worker and NestJS decide. Returning an
     * error paints the red verdict and offers another attempt on the SAME
     * challenge; the backend owns how many it allows (a 401 below means it is
     * done allowing them).
     */
    const onSession = useCallback(
        async (sessionId: string): Promise<{ error?: string } | void> => {
            const res = await createKycService().submitReverify({ challengeId, sessionId });
            if (res.status === 'passed' && res.stepToken) {
                stepTokenRef.current = res.stepToken;
                return;
            }
            lastFailRef.current =
                res.code === 'LIVENESS_FAILED' || res.code === 'FACE_NOT_DETECTED'
                    ? 'liveness'
                    : res.status === 'failed'
                      ? 'mismatch'
                      : 'error';
            return { error: res.message ?? res.reason ?? res.code ?? 'not verified' };
        },
        [challengeId],
    );

    // After the green verdict has been seen — hand the proof to the caller.
    const onPassed = useCallback(async () => {
        const token = stepTokenRef.current;
        if (token) settle({ ok: true, stepToken: token });
        else settle({ ok: false, reason: 'error' });
    }, [settle]);

    // The challenge is expired, spent or out of attempts: another try can only
    // be refused the same way, so return to the caller, which can ask again.
    const onExpired = useCallback(() => settle({ ok: false, reason: 'expired' }), [settle]);

    return (
        <div className="kyc-scope bg-white">
            <button
                type="button"
                onClick={() =>
                    // Report the last real verdict if there was one, so the caller can
                    // tell "gave up after a mismatch" from a plain cancel.
                    settle({ ok: false, reason: lastFailRef.current === 'error' ? 'cancelled' : lastFailRef.current })
                }
                className="absolute top-xd-50 end-xd-30 z-20 text-red-400 hover:text-red-600"
                aria-label="Cancel verification"
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
            <FaceLivenessScreen
                challengeId={challengeId}
                onSession={onSession}
                onPassed={onPassed}
                onExpired={onExpired}
            />
            {reason ? (
                <p className="pointer-events-none absolute inset-x-0 bottom-xd-12 px-xd-40 text-center text-xd-12 text-[#8D8D8D]">
                    {reason}
                </p>
            ) : null}
        </div>
    );
}
