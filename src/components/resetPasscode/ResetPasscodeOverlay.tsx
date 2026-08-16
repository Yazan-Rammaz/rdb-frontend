'use client';

import React from 'react';
import { useResetPasscode } from '@/context/ResetPasscodeContext';
import { FaceReverifyProvider } from '@/context/FaceReverifyContext';
import FaceReverifyOverlay from '@/components/faceReverify/FaceReverifyOverlay';
import ResetPasscodeFlow from './ResetPasscodeFlow';
import { Page } from '@/scaling';

/**
 * Global host for the reset-passcode flow. Mounted once (above PasskeyGate) so
 * it covers the lock screen. Hosts its **own** FaceReverifyProvider +
 * FaceReverifyOverlay so the verified branch's `satisfyStepUp` works here —
 * the lock screen sits outside the protected layout's FaceReverifyProvider.
 */
export default function ResetPasscodeOverlay() {
    const { active } = useResetPasscode();
    if (!active) return null;

    return (
        <FaceReverifyProvider>
            {/* Same scaled-canvas treatment as /auth (get-started): on web sizes
                the flow renders as a centered mobile canvas with plain white
                space left/right — no card, no shadow. */}
            <div className="fixed inset-0 z-9999 w-full h-dvh bg-white">
                <Page variant="scaled">
                    <main className="xd-fit-screen fixed inset-0 overflow-hidden">
                        <ResetPasscodeFlow />
                    </main>
                </Page>
            </div>
            <FaceReverifyOverlay />
        </FaceReverifyProvider>
    );
}
