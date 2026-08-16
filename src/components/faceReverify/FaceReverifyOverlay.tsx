'use client';

import React from 'react';
import { useFaceReverify } from '@/context/FaceReverifyContext';
import FaceVerifyFlow from './FaceVerifyFlow';

/**
 * Global host for the face re-verification flow. Mounted once in the protected
 * layout; renders a full-screen overlay (above app chrome) whenever a challenge
 * is active so the in-progress calling screen (e.g. a transfer form) is preserved
 * underneath rather than navigated away from.
 */
export default function FaceReverifyOverlay() {
    const { active, resolve } = useFaceReverify();
    if (!active) return null;

    return (
        <div className="fixed inset-0 z-9999 w-full h-dvh bg-white">
            <FaceVerifyFlow
                key={active.challengeId}
                challengeId={active.challengeId}
                reason={active.reason}
                onResult={resolve}
            />
        </div>
    );
}
