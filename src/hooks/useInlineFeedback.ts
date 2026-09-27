'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { screenMessage } from '@/lib/observe';

export type FeedbackTone = 'success' | 'error';

export interface Feedback {
    tone: FeedbackTone;
    text: string;
    /** Bumped on every new message, so the same text shown twice still re-animates. */
    id: number;
    /** Stays until `clear()` or the next message instead of timing out. */
    sticky?: boolean;
}

/** Long enough to read one short sentence; errors get more time than confirmations. */
const HIDE_AFTER_MS: Record<FeedbackTone, number> = { success: 3000, error: 6000 };

let feedbackIdCounter = 0;

/**
 * State for one inline feedback line — the replacement for a toast. The screen
 * renders `feedback` through `<InlineFeedback>` (or in a text slot it already
 * has) so the message appears where the user is looking and never moves anything.
 *
 * The line clears itself after a few seconds: it usually borrows space from
 * something else (a label, a gap), and that has to come back. `sticky` is for
 * the few places where the message is the only thing left to explain a dead
 * end, or where a vanished error invites a blind second tap on a payment.
 *
 * `success`, `error` and `clear` are stable — safe in effect and callback deps.
 */
export function useInlineFeedback() {
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    // Mirrors `feedback` so `show` can stay stable and still see what is up.
    const currentRef = useRef<Feedback | null>(null);

    const set = useCallback((next: Feedback | null) => {
        currentRef.current = next;
        setFeedback(next);
    }, []);

    const show = useCallback(
        (tone: FeedbackTone, text: string, sticky = false) => {
            const current = currentRef.current;
            if (current?.tone === tone && current.text === text) {
                // The same line again (a scanner re-reading the same bad code, a
                // double tap) only extends its life: same id, so no re-animation,
                // and no second report.
                set({ ...current, sticky });
                return;
            }
            set({ tone, text, sticky, id: ++feedbackIdCounter });
            // Every error line is a sentence a user read. The collector only sees
            // status codes, so without this a handled 400 records as a quiet session.
            if (tone === 'error') screenMessage(text);
        },
        [set],
    );

    // The timer follows the state rather than the call, so a remount (StrictMode
    // in dev) or a repeat of the same line restarts it instead of losing it.
    useEffect(() => {
        if (!feedback || feedback.sticky) return;
        const timer = setTimeout(() => set(null), HIDE_AFTER_MS[feedback.tone]);
        return () => clearTimeout(timer);
    }, [feedback, set]);

    const success = useCallback((text: string) => show('success', text), [show]);
    const error = useCallback(
        (text: string, options?: { sticky?: boolean }) => show('error', text, options?.sticky),
        [show],
    );
    const clear = useCallback(() => set(null), [set]);

    return useMemo(() => ({ feedback, success, error, clear }), [feedback, success, error, clear]);
}

export type InlineFeedbackState = ReturnType<typeof useInlineFeedback>;
