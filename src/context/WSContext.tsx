'use client';

import { api } from '@/api';
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
    useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsAccessToken } from '@/core/actions/websocket';
import { refreshAccessToken } from '@/core/utils';
import { useStore, mapWalletBalances } from './StoreContext';
import type { WalletBalance } from './StoreContext';
import type { FinancialLedgerItem } from '@/core/types';
import type {
    ConnectionState,
    WalletEventType,
    WSContextType,
    BalanceUpdatePayload,
    BalanceSnapshotPayload,
} from '@/core/types/websocket';
import { appConfig } from '@/config/app';

const LOG = '[WSContext]';

const WSContext = createContext<WSContextType | null>(null);

interface WSProviderProps {
    children: ReactNode;
    authCookieName?: string;
    wsBaseUrl?: string;
}

export function WSProvider({ children, authCookieName }: WSProviderProps) {
    const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
    const [socketVersion, setSocketVersion] = useState(0);
    const [wsBalanceUpdates, setWsBalanceUpdates] = useState<Record<string, number>>({});
    const socketRef = useRef<Socket | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 10;

    const baseUrl = process.env.NEXT_PUBLIC_WS_URL ?? appConfig.wsBaseUrl ?? '';

    useEffect(() => {
        let cancelled = false;

        async function connect() {
            console.log(
                `${LOG} Fetching WS access token (cookieName: ${authCookieName ?? 'rdb_at'})`,
            );
            const token = await getWsAccessToken(authCookieName);
            console.log(
                `${LOG} Token fetch ${token ? 'succeeded' : 'failed'}, Token: ${token ? '✓' : '✗'}`,
            );
            if (!token || token === '$undefined') {
                console.error(`${LOG} No access token found — aborting connection, state → ERROR`);
                setConnectionState('ERROR');
                return;
            }

            if (cancelled) return;

            console.log(`${LOG} Token acquired ✓ — connecting to ${baseUrl}/wallet`);

            const socket = io(`${baseUrl}/wallet`, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: MAX_RETRIES,
                reconnectionDelay: 2000,
                timeout: 10000,
                autoConnect: true,
            });

            socketRef.current = socket;
            setSocketVersion((v) => v + 1);
            setConnectionState('CONNECTING');
            console.log(`${LOG} Socket created, state → CONNECTING`);

            socket.on('connect', () => {
                console.log(
                    `${LOG} Socket connected (id: ${socket.id}) — waiting for 'authenticated'`,
                );
            });

            socket.on('authenticated', () => {
                if (cancelled) return;
                retryCountRef.current = 0;
                setConnectionState('AUTHENTICATED');
                console.log(
                    `${LOG} Authenticated ✓ — state → AUTHENTICATED, emitting balance:snapshot`,
                );
                socket.emit('balance:snapshot');
            });

            socket.on('disconnect', (reason) => {
                if (cancelled) return;
                setConnectionState('DISCONNECTED');
                console.warn(`${LOG} Disconnected (reason: ${reason}), state → DISCONNECTED`);
            });

            socket.on('connect_error', async (err) => {
                if (cancelled) return;
                retryCountRef.current += 1;
                console.warn(
                    `${LOG} connect_error (attempt ${retryCountRef.current}/${MAX_RETRIES}):`,
                    err.message,
                );

                if (retryCountRef.current >= MAX_RETRIES) {
                    setConnectionState('ERROR');
                    console.error(`${LOG} Max retries reached — state → ERROR`);
                    return;
                }

                console.log(`${LOG} Re-fetching token for retry ${retryCountRef.current}...`);
                // The access token may have expired (~5 min) — rotate it via the
                // refresh token first, then read the fresh one (parity with /sessions).
                await refreshAccessToken();
                const freshToken = await getWsAccessToken(authCookieName);
                if (freshToken && freshToken !== '$undefined') {
                    console.log(`${LOG} Fresh token acquired ✓ — retrying connection`);
                    socket.auth = { token: freshToken };
                    socket.connect();
                } else {
                    console.error(
                        `${LOG} No fresh token available (got: ${freshToken}) — will not retry`,
                    );
                }
            });

            socket.on('ws:error', (err: unknown) => {
                console.error(`${LOG} ws:error event received:`, err);
            });

            socket.on('balance:updated', (data: BalanceUpdatePayload) => {
                if (cancelled) return;
                setWsBalanceUpdates((prev) => ({
                    ...prev,
                    [data.assetSymbol]: (prev[data.assetSymbol] ?? 0) + 1,
                }));
            });
        }

        // TEMPORARILY DISABLED — uncomment to re-enable WebSocket
        connect();

        const handleOffline = () => {
            console.log(`${LOG} Browser went offline — disconnecting socket to stop retries`);
            socketRef.current?.disconnect();
            setConnectionState('DISCONNECTED');
        };

        const handleOnline = () => {
            console.log(`${LOG} Browser back online — reconnecting socket`);
            socketRef.current?.connect();
            setConnectionState('CONNECTING');
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            // window.removeEventListener('offline', handleOffline);
            // window.removeEventListener('online', handleOnline);
            console.log(`${LOG} WSProvider unmounting — disconnecting socket`);
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [baseUrl, authCookieName]);

    const on = useCallback(
        (event: WalletEventType, cb: (data: unknown) => void): (() => void) => {
            const socket = socketRef.current;
            if (!socket) return () => {};
            socket.on(event, cb as (...args: unknown[]) => void);
            return () => {
                socket.off(event, cb as (...args: unknown[]) => void);
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [socketVersion],
    );

    const requestBalanceSnapshot = useCallback(() => {
        console.log(`${LOG} requestBalanceSnapshot() — emitting balance:snapshot`);
        socketRef.current?.emit('balance:snapshot');
    }, []);

    const isLive = connectionState === 'AUTHENTICATED';

    return (
        <WSContext.Provider
            value={{ connectionState, isLive, on, requestBalanceSnapshot, wsBalanceUpdates }}
        >
            <WalletEventBridge />
            {children}
        </WSContext.Provider>
    );
}

export function useWS(): WSContextType {
    const ctx = useContext(WSContext);
    if (!ctx) throw new Error('useWS must be used inside <WSProvider>');
    return ctx;
}

/**
 * Build a provisional WalletBalance from a WS event payload so the UI can show
 * the new amount immediately. Identity fields (id, asset, account info) are
 * unknown here and get backfilled by the silent API refetch.
 */
function seedBalanceFromEvent(p: BalanceUpdatePayload): WalletBalance {
    return {
        id: '',
        accountId: '',
        assetType: p.assetType || 'CURRENCY',
        assetId: '',
        assetSymbol: p.assetSymbol,
        available: p.available,
        locked: p.locked,
        reserved: p.reserved,
        createdAt: p.timestamp,
        updatedAt: p.timestamp,
        asset: {
            id: '',
            name: p.assetSymbol,
            displayName: p.assetSymbol,
            symbol: p.assetSymbol,
            symbolImageUrl: '',
            isActive: true,
        },
        accountType: '',
        accountNumber: '',
    };
}

function WalletEventBridge() {
    const { on } = useWS();
    const { balances, setBalances, setTransactions } = useStore();
    const balancesRef = React.useRef(balances);
    balancesRef.current = balances;
    // Silent refetch for symbols missing from the store (first balance in a new
    // currency). Merges fresh entries without toggling loading flags so the
    // other balance cards don't flash skeletons or re-animate.
    const refetchRef = React.useRef<(symbol: string) => void>(() => {});
    refetchRef.current = (symbol: string) => {
        void (async () => {
            try {
                const walletResult = await api.transactions.walletBalance({
                    currencySymbol: symbol,
                });
                if (walletResult.ok) {
                    const fresh = mapWalletBalances(walletResult.data);
                    console.log(
                        `${LOG} balance refetch for '${symbol}' returned:`,
                        Object.keys(fresh),
                    );
                    const merged = { ...balancesRef.current };
                    for (const [sym, entry] of Object.entries(fresh)) {
                        const cur = merged[sym];
                        // If a WS event already gave us newer amounts than the
                        // fetched row, keep them — only backfill identity fields.
                        merged[sym] =
                            cur && new Date(cur.updatedAt) > new Date(entry.updatedAt)
                                ? {
                                      ...entry,
                                      available: cur.available,
                                      locked: cur.locked,
                                      reserved: cur.reserved,
                                      updatedAt: cur.updatedAt,
                                  }
                                : entry;
                    }
                    setBalances(merged);
                }
            } catch (err) {
                console.error(`${LOG} balance refetch for '${symbol}' failed:`, err);
            }
        })();
    };

    useEffect(() => {
        console.log(`${LOG} WalletEventBridge mounted — subscribing to wallet events`);

        const prependTx = (label: string, data: unknown) => {
            const ledger = data as FinancialLedgerItem;
            console.log(`${LOG} ${label} — upserting transaction`, ledger);
            setTransactions((prev: FinancialLedgerItem[]): FinancialLedgerItem[] => {
                // Remove ALL stale entries that match this ledger (by id or referenceId),
                // then prepend the fresh one — prevents duplicates when both
                // paymentRequest:created and ledger:created fire for the same request.
                const isMatch = (t: FinancialLedgerItem) =>
                    t.id === ledger.id || (!!ledger.referenceId && t.id === ledger.referenceId);
                const hasPrimary = prev.some((t) => t.id === ledger.id);
                if (hasPrimary) {
                    // Already present by exact id — replace in-place, drop any ghost entries
                    return prev
                        .map((t) => (t.id === ledger.id ? ledger : t))
                        .filter((t) => t.id === ledger.id || !isMatch(t));
                }
                const filtered = prev.filter((t) => !isMatch(t));
                return [ledger, ...filtered];
            });
        };

        const updateTxStatus = (label: string, data: unknown, status: string) => {
            const payload = data as { requestId: string; status?: string; timestamp: string };
            const resolvedStatus = payload.status || status;
            console.log(
                `${LOG} ${label} — updating payment request ${payload.requestId} → ${resolvedStatus}`,
            );
            setTransactions((prev: FinancialLedgerItem[]): FinancialLedgerItem[] =>
                prev.map((t) =>
                    t.referenceId === payload.requestId
                        ? { ...t, status: resolvedStatus, updatedAt: payload.timestamp }
                        : t,
                ),
            );
        };

        const unsubs = [
            on('balance:updated', (data) => {
                const payload = data as BalanceUpdatePayload;
                console.log(`${LOG} balance:updated — ${payload.assetSymbol}:`, {
                    available: payload.available,
                    locked: payload.locked,
                    reserved: payload.reserved,
                    total: payload.total,
                });
                const prev = balancesRef.current;
                const existing = prev[payload.assetSymbol];
                if (!existing) {
                    // First balance in this currency (e.g. first incoming transfer):
                    // seed an entry from the event so the card updates immediately,
                    // then backfill the full record from the API.
                    console.warn(
                        `${LOG} balance:updated — assetSymbol '${payload.assetSymbol}' not in store, seeding from event and refetching`,
                    );
                    setBalances({
                        ...prev,
                        [payload.assetSymbol]: seedBalanceFromEvent(payload),
                    });
                    refetchRef.current(payload.assetSymbol);
                    return;
                }
                setBalances({
                    ...prev,
                    [payload.assetSymbol]: {
                        ...existing,
                        available: payload.available,
                        locked: payload.locked,
                        reserved: payload.reserved,
                    },
                });
            }),

            on('balance:snapshot', (data) => {
                const payload = data as BalanceSnapshotPayload;
                console.log(
                    `${LOG} balance:snapshot — received ${payload.balances.length} balance(s):`,
                    payload.balances.map((b) => b.assetSymbol),
                );
                const prev = balancesRef.current;
                const updated = { ...prev };
                let unknownSymbol: string | null = null;
                for (const b of payload.balances) {
                    const existing = prev[b.assetSymbol];
                    if (existing) {
                        updated[b.assetSymbol] = {
                            ...existing,
                            available: b.available,
                            locked: b.locked,
                            reserved: b.reserved,
                        };
                    } else {
                        console.warn(
                            `${LOG} balance:snapshot — assetSymbol '${b.assetSymbol}' not in store, seeding from event`,
                        );
                        updated[b.assetSymbol] = seedBalanceFromEvent(b);
                        unknownSymbol = b.assetSymbol;
                    }
                }
                setBalances(updated);
                // Backfill identity fields (id, asset, account info) for any
                // seeded entries from the API.
                if (unknownSymbol) refetchRef.current(unknownSymbol);
            }),

            on('ledger:created', (d) => prependTx('ledger:created', d)),
            on('ledger:completed', (d) => prependTx('ledger:completed', d)),
            on('ledger:failed', (d) => prependTx('ledger:failed', d)),
            on('ledger:cancelled', (d) => prependTx('ledger:cancelled', d)),

            on('paymentRequest:created', (data) => {
                const payload = data as import('@/core/types/websocket').PaymentRequestEventPayload;
                console.log(`${LOG} paymentRequest:created — adding pending entry`, payload);
                setTransactions((prev: FinancialLedgerItem[]): FinancialLedgerItem[] => {
                    if (
                        prev.some(
                            (t) =>
                                t.id === payload.requestId || t.referenceId === payload.requestId,
                        )
                    )
                        return prev;
                    const item: FinancialLedgerItem = {
                        id: payload.requestId,
                        userId: payload.fromUserId,
                        ledgerType: 'PAYMENT_REQUEST',
                        status: 'PENDING',
                        direction: 'IN',
                        title: 'Payment Request',
                        description: null,
                        assetType: 'CURRENCY',
                        assetId: payload.assetSymbol,
                        assetSymbol: payload.assetSymbol,
                        amount: payload.amount,
                        feeAmount: 0,
                        taxAmount: 0,
                        senderUserId: payload.toUserId,
                        senderAccountId: '',
                        receiverUserId: payload.fromUserId,
                        receiverAccountId: '',
                        referenceId: payload.requestId,
                        errorMessage: null,
                        note: null,
                        metadata: null,
                        createdAt: payload.timestamp,
                        updatedAt: payload.timestamp,
                    };
                    return [item, ...prev];
                });
            }),

            on('paymentRequest:fulfilled', (d) =>
                updateTxStatus('paymentRequest:fulfilled', d, 'COMPLETED'),
            ),
            on('paymentRequest:cancelled', (d) =>
                updateTxStatus('paymentRequest:cancelled', d, 'CANCELLED'),
            ),
            on('paymentRequest:expired', (d) =>
                updateTxStatus('paymentRequest:expired', d, 'EXPIRED'),
            ),
        ];

        return () => {
            console.log(`${LOG} WalletEventBridge unmounting — unsubscribing all wallet events`);
            unsubs.forEach((u) => u());
        };
    }, [on, setBalances, setTransactions]);

    return null;
}
