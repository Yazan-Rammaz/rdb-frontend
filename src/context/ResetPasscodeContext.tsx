'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Where the user entered the reset flow from (RESET_PASSCODE_WEB_INTEGRATION.md §0.1):
 *  - 'idle' — the app-lock screen of a logged-in session (Bearer = rdb_at).
 *  - 'step' — the mid-login passcode step (Bearer = the 10-min login stepToken).
 *    No OTP, face never offered; on completion the user finishes the login by
 *    entering the NEW passcode on the login passcode step.
 */
export type ResetPasscodeEntry = 'idle' | 'step';

/**
 * Drives the global "Forget / Reset Passcode" overlay. Any screen (the lock
 * screen rendered by PasskeyGate, or the mid-login passcode step on the auth
 * page) calls `start()` to open the flow; the overlay renders above all app
 * chrome. Mirrors FaceReverifyContext's shape.
 */
interface ResetPasscodeContextValue {
    /** True while the reset overlay is open. */
    active: boolean;
    /** Which entry point opened the flow (valid while `active`). */
    entry: ResetPasscodeEntry;
    /** Open the reset-passcode flow for the given entry point. */
    start: (entry?: ResetPasscodeEntry) => void;
    /**
     * Close the reset-passcode flow. `notice` is a line for the screen the
     * overlay uncovers (the /auth passcode step) — the flow itself unmounts.
     */
    close: (notice?: string) => void;
    /** The line left by the last `close(notice)`; cleared by `start()` and `clearNotice()`. */
    notice: string | null;
    clearNotice: () => void;
}

const ResetPasscodeContext = createContext<ResetPasscodeContextValue | null>(null);

export function ResetPasscodeProvider({ children }: { children: React.ReactNode }) {
    const [active, setActive] = useState(false);
    const [entry, setEntry] = useState<ResetPasscodeEntry>('idle');
    const [notice, setNotice] = useState<string | null>(null);

    const start = useCallback((e: ResetPasscodeEntry = 'idle') => {
        setEntry(e);
        setNotice(null);
        setActive(true);
    }, []);
    const close = useCallback((n?: string) => {
        // Screens pass `close` straight to onClick, so `n` can be a click event.
        setNotice(typeof n === 'string' ? n : null);
        setActive(false);
    }, []);
    const clearNotice = useCallback(() => setNotice(null), []);

    const value = useMemo(
        () => ({ active, entry, start, close, notice, clearNotice }),
        [active, entry, start, close, notice, clearNotice],
    );

    return (
        <ResetPasscodeContext.Provider value={value}>
            {children}
        </ResetPasscodeContext.Provider>
    );
}

export function useResetPasscode() {
    const ctx = useContext(ResetPasscodeContext);
    if (!ctx) throw new Error('useResetPasscode must be used within a ResetPasscodeProvider');
    return ctx;
}
