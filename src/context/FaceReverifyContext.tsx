'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/**
 * Outcome of a face re-verification challenge, returned to whoever called
 * `requestFaceReverify`. On `ok`, the caller persists the `stepToken` and retries
 * the gated action carrying it.
 */
export type FaceReverifyOutcome =
    | { ok: true; stepToken: string }
    | { ok: false; reason: 'mismatch' | 'liveness' | 'cancelled' | 'expired' | 'error' };

export interface FaceReverifyChallenge {
    challengeId: string;
    reason?: string;
}

interface FaceReverifyContextValue {
    /** The active challenge, or null when the overlay is closed. */
    active: FaceReverifyChallenge | null;
    /**
     * Open the face re-verification overlay for a server-issued challenge and
     * resolve once the user passes, fails, or cancels. Only one challenge runs at
     * a time — a second call while one is active rejects the earlier promise.
     */
    requestFaceReverify: (challenge: FaceReverifyChallenge) => Promise<FaceReverifyOutcome>;
    /** Called by the overlay to settle the active challenge and close it. */
    resolve: (outcome: FaceReverifyOutcome) => void;
}

const FaceReverifyContext = createContext<FaceReverifyContextValue | null>(null);

export function FaceReverifyProvider({ children }: { children: React.ReactNode }) {
    const [active, setActive] = useState<FaceReverifyChallenge | null>(null);
    const resolverRef = useRef<((o: FaceReverifyOutcome) => void) | null>(null);

    const requestFaceReverify = useCallback((challenge: FaceReverifyChallenge) => {
        return new Promise<FaceReverifyOutcome>((resolve) => {
            // If a challenge is already pending, cancel it before starting the new one.
            if (resolverRef.current) resolverRef.current({ ok: false, reason: 'cancelled' });
            resolverRef.current = resolve;
            setActive({ challengeId: challenge.challengeId, reason: challenge.reason });
        });
    }, []);

    const resolve = useCallback((outcome: FaceReverifyOutcome) => {
        const r = resolverRef.current;
        resolverRef.current = null;
        setActive(null);
        r?.(outcome);
    }, []);

    return (
        <FaceReverifyContext.Provider value={{ active, requestFaceReverify, resolve }}>
            {children}
        </FaceReverifyContext.Provider>
    );
}

export function useFaceReverify() {
    const ctx = useContext(FaceReverifyContext);
    if (!ctx) throw new Error('useFaceReverify must be used within a FaceReverifyProvider');
    return ctx;
}
