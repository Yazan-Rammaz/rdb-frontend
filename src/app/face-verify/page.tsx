'use client';

import React, { Suspense, useCallback } from 'react';
import {useSearchParams, useRouter } from 'next/navigation';
import FaceVerifyFlow from '@/components/faceReverify/FaceVerifyFlow';
import type { FaceReverifyOutcome } from '@/context/FaceReverifyContext';
import { api } from '@/api';

/**
 * Standalone face re-verification route.
 *
 * Used for entry points OUTSIDE the protected layout (e.g. the forgot-passcode
 * flow), where the global overlay provider isn't mounted. In-app gated actions
 * (transfer, withdraw) should prefer the global overlay via `useFaceReverify()`
 * so the calling screen's state is preserved.
 *
 * Query params: `challengeId` (required), `reason`, `returnTo` (default `/home`).
 */
function FaceVerifyPageInner() {
    const params = useSearchParams();
    const router = useRouter();

    const challengeId = params.get('challengeId') ?? '';
    const reason = params.get('reason') ?? undefined;
    const returnTo = params.get('returnTo') || '/home';

    const onResult = useCallback(
        async (outcome: FaceReverifyOutcome) => {
            if (outcome.ok) {
                // Persist the step token so the retried action can carry it.
                await api.session.saveStepToken({ stepToken: outcome.stepToken });
                const sep = returnTo.includes('?') ? '&' : '?';
                router.push(`${returnTo}${sep}stepUp=face`);
            } else {
                router.push(returnTo);
            }
        },
        [returnTo, router],
    );

    if (!challengeId) {
        return (
            <div className="flex h-dvh items-center justify-center text-sm text-[#8D8D8D]">
                Missing verification challenge.
            </div>
        );
    }

    return (
        <div className="h-dvh w-full bg-white">
            <FaceVerifyFlow challengeId={challengeId} reason={reason} onResult={onResult} />
        </div>
    );
}

export default function FaceVerifyPage() {
    return (
        <Suspense fallback={null}>
            <FaceVerifyPageInner />
        </Suspense>
    );
}
