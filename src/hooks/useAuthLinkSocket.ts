'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { appConfig } from '@/config/app';

const LOG = '[auth-link]';

// ── Event payloads (mirror the NestJS /auth-link namespace contract) ──────────
// ⚠️ CONFIRM WITH BACKEND: exact field names of `qr:scanned` (see QrLogin.tsx).
export interface QrScannedPayload {
    web?: { browser?: string; os?: string };
    sameCity?: boolean;
    webCity?: string | null;
    appCity?: string | null;
}
export interface QrApprovedPayload {
    sessionToken: string;
}
export interface QrLinkPayload {
    linkId: string;
}

export interface AuthLinkHandlers {
    onScanned?: (p: QrScannedPayload) => void;
    onApproved?: (p: QrApprovedPayload) => void;
    onRejected?: (p: QrLinkPayload) => void;
    onExpired?: (p: QrLinkPayload) => void;
    onError?: (err: unknown) => void;
}

/**
 * Subscribe to the pre-auth `/auth-link` websocket room for a QR login session.
 *
 * This is intentionally separate from WSContext (the `/wallet` namespace), which
 * is JWT-authenticated and only mounts on protected routes. Here the user is NOT
 * logged in yet — the room is gated by { linkId, subscribeSecret } instead.
 *
 * The connection opens only once both `linkId` and `subscribeSecret` are present,
 * and tears down on unmount or when they change. socket.io auto-reconnects; the
 * backend replays the latest status on (re)connect, so treat events as
 * "latest state", not "exactly once" (QrLogin guards completion with a ref).
 */
export function useAuthLinkSocket(
    linkId: string | null,
    subscribeSecret: string | null,
    handlers: AuthLinkHandlers,
): void {
    // Keep handlers in a ref so changing them doesn't reconnect the socket.
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        if (!linkId || !subscribeSecret) return;

        // Same fallback chain as WSContext (the /wallet socket): explicit env
        // override → appConfig.wsBaseUrl → same-origin. Without the appConfig
        // fallback, an unset NEXT_PUBLIC_WS_URL pointed socket.io at the Next dev
        // server (no socket.io server there) → endless connect_error timeouts.
        const baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? appConfig.wsBaseUrl ?? '';
        const socket: Socket = io(`${baseUrl}/auth-link`, {
            auth: { linkId, subscribeSecret },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            timeout: 10000,
            autoConnect: true,
        });

        socket.on('connect', () => console.log(`${LOG} connected (id: ${socket.id})`));
        socket.on('qr:scanned', (p: QrScannedPayload) => handlersRef.current.onScanned?.(p));
        socket.on('qr:approved', (p: QrApprovedPayload) => handlersRef.current.onApproved?.(p));
        socket.on('qr:rejected', (p: QrLinkPayload) => handlersRef.current.onRejected?.(p));
        socket.on('qr:expired', (p: QrLinkPayload) => handlersRef.current.onExpired?.(p));
        socket.on('connect_error', (err) => {
            console.warn(`${LOG} connect_error`, err?.message ?? err);
            handlersRef.current.onError?.(err);
        });

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [linkId, subscribeSecret]);
}
