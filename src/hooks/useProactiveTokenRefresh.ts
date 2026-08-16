'use client';

import { useEffect } from 'react';
import { refreshAccessToken, readAccessTokenExpiry } from '@/core/utils';

// Refresh this long before the access token actually expires, so authenticated
// calls/sockets never hit a 401 while the site is open.
const LEAD_MS = 60_000;
// After a transient (network/5xx) refresh failure, retry soon instead of giving up.
const RETRY_MS = 15_000;

/**
 * Keeps the access token alive while the website is open by refreshing it ~1 min
 * before expiry (via the refresh token) — token refresh only, never a page reload.
 * Independent of the idle lock: the token stays fresh even while LOCKED, so an
 * unlock or background socket never fails on an expired token.
 *
 * Triggers: on mount, on a timer scheduled from the readable expiry cookie, and
 * whenever the tab regains focus (covers background-tab timer throttling). Refresh
 * is single-flight + cross-tab deduped in refreshAccessToken().
 */
export function useProactiveTokenRefresh(): void {
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const clear = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        };

        const refreshNow = async () => {
            if (cancelled) return;
            const result = await refreshAccessToken();
            if (cancelled) return;
            if (result === 'refreshed') {
                schedule();
            } else if (result === 'transient') {
                // Network/backend blip — the session is likely still valid; retry
                // soon rather than giving up (and never hard-logout from here).
                timer = setTimeout(() => void refreshNow(), RETRY_MS);
            }
            // 'unauthenticated' → stop; the next real API call hard-logs-out.
        };

        const schedule = () => {
            clear();
            const exp = readAccessTokenExpiry();
            if (exp == null) return; // unknown expiry → rely on reactive refresh
            const delay = exp - LEAD_MS - Date.now();
            if (delay <= 0) {
                void refreshNow();
            } else {
                timer = setTimeout(() => void refreshNow(), delay);
            }
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') schedule();
        };

        schedule();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clear();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);
}
