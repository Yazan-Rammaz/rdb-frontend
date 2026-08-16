import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

/**
 * Calls `onIdle` after `timeoutMs` of no user activity.
 * Pass `enabled=false` to pause the timer (e.g. when already locked).
 */
export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled = true) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Keep a stable ref so we don't need onIdle in the dep array
    const onIdleRef = useRef(onIdle);
    onIdleRef.current = onIdle;

    const reset = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    }, [timeoutMs]);

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        IDLE_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            IDLE_EVENTS.forEach(e => window.removeEventListener(e, reset));
        };
    }, [enabled, reset]);
}
