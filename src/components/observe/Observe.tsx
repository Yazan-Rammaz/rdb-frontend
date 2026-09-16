'use client';

import { useEffect } from 'react';
import { startObserve, setCorrelation } from '@/lib/observe';
import { useAuth } from '@/context/AuthContext';

/**
 * Starts the collector. Mount it as the first child of <body> so the hooks are
 * installed before anything else can throw or fetch.
 *
 * Configuration lives in src/lib/observe/index.ts, not here — and most of it
 * lives on the dashboard, not in the repo at all.
 */
export function Observe() {
    useEffect(() => {
        startObserve();
    }, []);

    return null;
}

/**
 * Labels the session with the signed-in user's id.
 *
 * Without this a session is a random per-tab id, which is enough to see that
 * something failed and useless for finding the session a particular person is
 * complaining about. The id used here is the same one NestJS logs.
 *
 * Must render inside <AuthProvider>. Kept separate from <Observe> for exactly
 * that reason: the collector has to start above the providers, the label can
 * only be read from inside them.
 */
export function ObserveCorrelation() {
    const { userData, loginStep } = useAuth();

    // `loginStep.user.id` covers the mid-login window — passcode entry, passcode
    // reset — where there is no session yet but plenty worth correlating.
    const userId =
        userData?.user?.id ??
        userData?.id ??
        (loginStep && 'user' in loginStep ? loginStep.user?.id : undefined);

    useEffect(() => {
        if (userId) setCorrelation(userId);
    }, [userId]);

    return null;
}
