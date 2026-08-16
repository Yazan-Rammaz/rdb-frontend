'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    useSessionRevocation,
    type SessionRevocationPayload,
    type SessionRevocationReason,
} from '@/hooks/useSessionRevocation';
import { useProactiveTokenRefresh } from '@/hooks/useProactiveTokenRefresh';

/** Read the readable (non-httpOnly) current-session-id cookie set at login. */
function readSessionId(): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(?:^|;\s*)rdb_sid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

interface SessionTakeoverContextType {
    /** epoch ms when a newer web login replaced this session, else null. */
    takeoverSince: number | null;
}

const SessionTakeoverContext = createContext<SessionTakeoverContextType>({ takeoverSince: null });

/**
 * Mounted ABOVE PasskeyGate so the takeover state is known before the lock screen
 * renders. It:
 *  - keeps the access token alive (proactive refresh ~1 min before expiry), and
 *  - listens on the `/sessions` websocket for revocation.
 *
 * When a NEWER web login replaces this one (`session:revoked_by_new_login`) we do
 * NOT redirect — we expose `takeoverSince` so PasskeyGate shows the "logged in via
 * the web" screen (even while LOCKED) instead of the unlock screen. The session is
 * dead server-side, so the moment the user refreshes the normal auth check routes
 * them to Get Started. Every other revocation reason logs out immediately.
 */
export function SessionTakeoverProvider({ children }: { children: React.ReactNode }) {
    const { removeAuthCookies } = useAuth();
    const [takeoverSince, setTakeoverSince] = useState<number | null>(null);

    // Keep the access token fresh while the site is open (token refresh, no reload).
    useProactiveTokenRefresh();

    const handleRevoked = useCallback(
        async (reason: SessionRevocationReason, payload?: SessionRevocationPayload) => {
            // Web-to-web: a newer web login took over. Keep the page as-is and show
            // the takeover overlay reading the in-memory account data — no redirect.
            if (reason === 'session:revoked_by_new_login') {
                // The event is broadcast to EVERY socket the user holds, including the
                // brand-new session that just logged in. Only the session whose id
                // matches `revokedSessionId` is the one that was replaced and should
                // show the takeover overlay.
                //
                // Fail SAFE: only show the overlay on a POSITIVE id match. If we can't
                // confirm this session is the revoked one — no id in the payload, or
                // rdb_sid not yet readable right after a fresh login (a Set-Cookie /
                // socket-event race) — we must NOT block the UI. Failing closed here
                // would freeze a brand-new, valid session behind the takeover overlay
                // (it would never reach /home until a manual refresh). The API 401
                // remains the source of truth for a genuinely dead session.
                const mySessionId = readSessionId();
                const revokedId = payload?.revokedSessionId;
                if (!mySessionId || !revokedId || mySessionId !== revokedId) {
                    return; // not confirmably the revoked session — ignore
                }
                // Suppress the in-memory hard-logout/redirect so the overlay stays up
                // until the user refreshes (a refresh clears this flag).
                (window as unknown as { __rdbSessionTakeover?: boolean }).__rdbSessionTakeover =
                    true;
                setTakeoverSince((prev) => prev ?? Date.now());
                return;
            }
            // Any other reason (remote logout, app switch-back, all-revoked):
            // session is already dead server-side; clear local state and route to login.
            await removeAuthCookies();
            if (typeof window !== 'undefined') window.location.href = '/auth';
        },
        [removeAuthCookies],
    );

    useSessionRevocation(handleRevoked);

    return (
        <SessionTakeoverContext.Provider value={{ takeoverSince }}>
            {children}
        </SessionTakeoverContext.Provider>
    );
}

export function useSessionTakeover(): SessionTakeoverContextType {
    return useContext(SessionTakeoverContext);
}
