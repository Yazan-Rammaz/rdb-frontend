'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isNetworkError } from '@/api';
import { resolvePaymentRequestLookup } from '@/api/helpers/paymentRequests';
import { useWS } from '@/context/WSContext';
import { useStore } from '@/context/StoreContext';
import { usePasskey } from '@/context/PasskeyContext';
import { useIsOnline } from '@/hooks/useIsOnline';
import type { PaymentRequestStatus } from '@/core/types';
import type { PaymentRequestEventPayload, WalletEventType } from '@/core/types/websocket';

/** The request to watch. `null` = nothing to watch (settled, expired, or none). */
export interface WatchedPaymentRequest {
    id: string;
    requestCode: string;
}

/** How a request ended, as the server reported it. */
export interface SettledPaymentRequest {
    status: Exclude<PaymentRequestStatus, 'ACTIVE'>;
    amount?: number;
    assetSymbol?: string;
}

/** Fallback check cadence: fast while the socket is down, slow while it is live. */
const POLL_MS_OFFLINE_SOCKET = 5_000;
const POLL_MS_LIVE_SOCKET = 15_000;

/** The status comes from the event name — `payload.status` is a ledger status. */
const SETTLE_EVENTS: [WalletEventType, SettledPaymentRequest['status']][] = [
    ['paymentRequest:fulfilled', 'FULFILLED'],
    ['paymentRequest:cancelled', 'CANCELLED'],
    ['paymentRequest:expired', 'EXPIRED'],
];

/**
 * Tells the requester's screen when its payment request has been paid,
 * cancelled or expired on the server.
 *
 * Push first: the wallet socket's `paymentRequest:*` events, matched on the
 * request id. Pull as a safety net: a lookup every 5 s (15 s while the socket
 * is live), because a dropped socket or an undelivered event must not leave
 * the QR and countdown on screen after the money arrived.
 *
 * The lookup goes through `api.*` directly, not `usePaymentRequestAPI` — that
 * hook's shared `isLoading` would blink the Generate button on every tick, and
 * its backoff retry is wrong for a poll. Every failure is silent: network and
 * 5xx failures wait for the next tick, any other status stops the poll for
 * this request (the socket and `refresh()` still work).
 *
 * The poll only runs while it can matter: online, tab visible, app unlocked.
 */
export function usePaymentRequestStatus(request: WatchedPaymentRequest | null) {
    const { on, isLive } = useWS();
    const { refreshTransactions } = useStore();
    const { lockStatus } = usePasskey();
    const isOnline = useIsOnline();

    const id = request?.id ?? null;
    const requestCode = request?.requestCode ?? null;

    // Keyed by id: a new request starts clean, a late answer for an old one is ignored.
    const [settledEntry, setSettledEntry] = useState<{
        id: string;
        value: SettledPaymentRequest;
    } | null>(null);
    const settled = settledEntry && settledEntry.id === id ? settledEntry.value : null;
    const isSettled = settled !== null;

    // A request whose lookup answered with a non-retryable status is not polled again.
    const [pollStoppedFor, setPollStoppedFor] = useState<string | null>(null);

    const refreshTransactionsRef = useRef(refreshTransactions);
    refreshTransactionsRef.current = refreshTransactions;
    // Shared by the poll, the visibility check and refresh(): one lookup at a time.
    const inFlightRef = useRef<Promise<SettledPaymentRequest | null> | null>(null);

    /** One lookup. Resolves to the settled state, or null while ACTIVE / on failure. */
    const check = useCallback(
        (signal?: AbortSignal): Promise<SettledPaymentRequest | null> => {
            if (!id || !requestCode) return Promise.resolve(null);
            if (inFlightRef.current) return inFlightRef.current;

            const run = (async () => {
                const res = await api.paymentRequests.lookup(requestCode, { signal });
                if (signal?.aborted) return null;

                if (!res.ok) {
                    const retryable = isNetworkError(res.error) || res.error.status >= 500;
                    if (!retryable && res.error.status !== 0) setPollStoppedFor(id);
                    return null;
                }

                const resolved = resolvePaymentRequestLookup(res.data);
                if (resolved?.kind !== 'USER' || resolved.request.id !== id) return null;
                const { status, amount, assetSymbol } = resolved.request;
                if (status === 'ACTIVE') return null;

                const value: SettledPaymentRequest = { status, amount, assetSymbol };
                setSettledEntry({ id, value });
                // The socket did not tell us, so the history may not know either.
                if (status === 'FULFILLED') void refreshTransactionsRef.current();
                return value;
            })().finally(() => {
                inFlightRef.current = null;
            });

            inFlightRef.current = run;
            return run;
        },
        [id, requestCode],
    );

    // Push: the wallet socket.
    useEffect(() => {
        if (!id || isSettled) return;
        const offs = SETTLE_EVENTS.map(([event, status]) =>
            on(event, (data) => {
                const payload = data as PaymentRequestEventPayload;
                if (payload?.requestId !== id) return;
                setSettledEntry({
                    id,
                    value: { status, amount: payload.amount, assetSymbol: payload.assetSymbol },
                });
            }),
        );
        return () => offs.forEach((off) => off());
    }, [on, id, isSettled]);

    // Pull: the fallback lookup.
    const canPoll =
        !!id &&
        !!requestCode &&
        !isSettled &&
        pollStoppedFor !== id &&
        isOnline &&
        lockStatus === 'UNLOCKED';
    const pollMs = isLive ? POLL_MS_LIVE_SOCKET : POLL_MS_OFFLINE_SOCKET;

    useEffect(() => {
        if (!canPoll) return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        // One tick chain: a visibility check during a tick must not start a second one.
        let ticking = false;

        const tick = async () => {
            // Hidden: wait for visibilitychange instead of ticking in the background.
            if (ticking || document.hidden) return;
            clearTimeout(timer);
            ticking = true;
            await check(controller.signal);
            ticking = false;
            if (!controller.signal.aborted) timer = setTimeout(tick, pollMs);
        };

        const onVisibilityChange = () => {
            if (!document.hidden) void tick();
        };

        timer = setTimeout(tick, pollMs);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            controller.abort();
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [canPoll, pollMs, check]);

    /** One immediate check — for the moment the countdown runs out. */
    const refresh = useCallback(() => check(), [check]);

    return { settled, refresh };
}
