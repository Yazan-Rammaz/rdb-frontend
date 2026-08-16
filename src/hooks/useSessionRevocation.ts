'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsAccessToken } from '@/core/actions/websocket';
import { refreshAccessToken } from '@/core/utils';
import { appConfig } from '@/config/app';

const LOG = '[sessions]';
const MAX_RETRIES = 10;
const HEARTBEAT_MS = 30_000; // keep lastActiveAt fresh (WEBSOCKET_NAMESPACES_AND_EVENTS.md §3)

// Revocation events from the authenticated /sessions namespace
// (SESSION_REDESIGN_WEB_GUIDE.md §4). Any of these means this web session is gone.
export type SessionRevocationReason =
    | 'session:revoked_by_switch' // app "switched back" and took over
    | 'session:revoked_by_new_login' // a newer login on the same platform replaced this one
    | 'session:revoked' // this session revoked (e.g. "log out this session")
    | 'session:all_revoked'; // all other sessions revoked (password change/reset)

const REVOCATION_EVENTS: SessionRevocationReason[] = [
    'session:revoked_by_switch',
    'session:revoked_by_new_login',
    'session:revoked',
    'session:all_revoked',
];

/** Payload shapes the revocation events may carry (see WEBSOCKET_NAMESPACES doc §3). */
export interface SessionRevocationPayload {
    /** `session:revoked_by_new_login` — id of the session that was replaced. */
    revokedSessionId?: string;
    reason?: string;
    newIpAddress?: string;
    sessionId?: string;
    exceptSessionToken?: string;
}

/**
 * Subscribe to the authenticated `/sessions` websocket namespace and fire
 * `onRevoked` when the server revokes this web session.
 *
 * Web is a "guest" session: the app can revoke it at any time (app login, or app
 * "switch back"). The WS is the fast path; the `401`-that-won't-refresh on the API
 * is the source of truth (handled in the fetch wrapper), so a WS that can't connect
 * is non-fatal — we just bound the retries and let the API layer catch it.
 *
 * The socket authenticates with the (~15-min) access token, so on `connect_error`
 * we run a single-flight refresh and re-auth with the rotated token before retrying.
 */
export function useSessionRevocation(
    onRevoked: (reason: SessionRevocationReason, payload?: SessionRevocationPayload) => void,
): void {
    const onRevokedRef = useRef(onRevoked);
    onRevokedRef.current = onRevoked;

    useEffect(() => {
        let cancelled = false;
        let socket: Socket | null = null;
        let retries = 0;
        let heartbeat: ReturnType<typeof setInterval> | null = null;

        const stopHeartbeat = () => {
            if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = null;
            }
        };

        async function connect() {
            const token = await getWsAccessToken();
            if (!token || cancelled) return;

            const baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? appConfig.wsBaseUrl ?? '';
            socket = io(`${baseUrl}/sessions`, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: MAX_RETRIES,
                reconnectionDelay: 2000,
                timeout: 10000,
                autoConnect: true,
            });

            socket.on('connect', () => {
                retries = 0;
                console.log(`${LOG} connected (id: ${socket?.id})`);
                // Periodic heartbeat updates lastActiveAt server-side (idle/lock logic).
                stopHeartbeat();
                heartbeat = setInterval(() => socket?.emit('heartbeat'), HEARTBEAT_MS);
            });

            socket.on('disconnect', () => stopHeartbeat());

            for (const event of REVOCATION_EVENTS) {
                socket.on(event, (payload?: SessionRevocationPayload) => {
                    if (cancelled) return;
                    console.warn(`${LOG} ${event} → session revoked`, payload ?? '');
                    onRevokedRef.current(event, payload);
                });
            }

            socket.on('connect_error', async (err) => {
                if (cancelled) return;
                retries += 1;
                console.warn(`${LOG} connect_error (${retries}/${MAX_RETRIES})`, err?.message ?? err);
                if (retries >= MAX_RETRIES) return;
                // Access token may have expired — rotate it and re-auth before retrying.
                await refreshAccessToken();
                const fresh = await getWsAccessToken();
                if (fresh && socket && !cancelled) {
                    socket.auth = { token: fresh };
                    socket.connect();
                }
            });
        }

        connect();

        return () => {
            cancelled = true;
            stopHeartbeat();
            socket?.removeAllListeners();
            socket?.disconnect();
            socket = null;
        };
    }, []);
}
