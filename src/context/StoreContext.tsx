'use client';

import {
    AssetItem,
    FinancialLedgerApi,
    FinancialLedgerItem,
    GetWalletBalancesApi,
} from '@/core/types';
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useRef,
    useCallback,
    useEffect,
    use,
} from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/api';

/** A single balance entry enriched with wallet-level account info */
export interface WalletBalance {
    id: string;
    accountId: string;
    assetType: string;
    assetId: string;
    assetSymbol: string;
    available: number;
    locked: number;
    reserved: number;
    createdAt: string;
    updatedAt: string;
    asset: {
        id: string;
        name: string;
        displayName: string;
        symbol: string;
        symbolImageUrl: string;
        isActive: boolean;
    };
    /** account type (MAIN) */
    accountType: string;
    /** Wallet-level account number (e.g. "0000-0016") */
    accountNumber: string;
}

// Balance mapped by currency symbol for fast lookup
export type BalancesMap = Record<string, WalletBalance>;

export interface PurposeOption {
    id: string;
    label: string;
}

interface StoreContextType {
    currencies: AssetItem[];
    metals: AssetItem[];
    activeAssetSymbol?: string;
    activeAssetType?: string;
    transactions: FinancialLedgerItem[];
    balances: BalancesMap;
    account: { name: string; type: string; number: string; displayId?: string };
    setAccount: (_val: { name: string; type: string; number: string; displayId?: string }) => void;
    balanceHidden: boolean;
    purposes: PurposeOption[];
    setCurrencies: (_val: AssetItem[]) => void;
    setMetals: (_val: AssetItem[]) => void;
    setActiveAssetSymbol: (_val: string | undefined) => void;
    setActiveAssetType: (_val: string | undefined) => void;
    setBalances: (_val: BalancesMap) => void;
    setTransactions: React.Dispatch<React.SetStateAction<FinancialLedgerItem[]>>;
    setBalanceHidden: (_val: boolean) => void;
    setPurposes: (_val: PurposeOption[]) => void;
    // Preload state - separate loading for each data type
    isDataLoaded: boolean;
    isLoadingCurrencies: boolean;
    isLoadingMetals: boolean;
    isLoadingBalances: boolean;
    isLoadingTransactions: boolean;
    isLoadingMoreTransactions: boolean;
    isLoadingPurposes: boolean;
    transactionHasMore: boolean;
    preloadData: () => Promise<void>;
    // Refresh functions for updating data after actions
    refreshTransactions: () => Promise<void>;
    loadMoreTransactions: () => Promise<void>;
    refreshBalances: (currencySymbol?: string) => Promise<void>;
    transactionTotalPages: number | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

/** Helper: map API wallet response into BalancesMap */
export function mapWalletBalances(response: any): BalancesMap {
    const allBalances: BalancesMap = {};
    if (response && !('error' in response) && Array.isArray(response.wallets)) {
        response.wallets.forEach((wallet: any) => {
            if (!Array.isArray(wallet?.balances)) return;
            wallet.balances.forEach((balance: any) => {
                // Fresh accounts get placeholder rows for all supported assets
                // with no balance id yet — keep them so the store always has an
                // entry per asset (WS updates patch them in place).
                if (balance?.assetSymbol) {
                    allBalances[balance.assetSymbol] = {
                        ...balance,
                        id: balance.id ?? '',
                        available: balance.available ?? 0,
                        locked: balance.locked ?? 0,
                        reserved: balance.reserved ?? 0,
                        accountType: wallet.subtype || wallet.type || '',
                        accountNumber: wallet.accountNumber || '',
                    };
                }
            });
        });
    }
    return allBalances;
}

// mapPurposes lived here: it took `any` and guarded with Array.isArray, because
// the action layer gave no type to check against. Both call sites now go through
// @/api, where the response is typed, so the runtime guard has nothing left to
// defend against and the mapping is a one-liner at each site.

export function StoreProvider({ children }: { children: ReactNode }) {
    const { userData, removeAuthCookies } = useAuth();
    // Held in a ref, not read straight from the closure: AuthProvider builds
    // removeAuthCookies fresh on every render, so putting it in preloadData's
    // dependency list would give preloadData a new identity each render — and
    // ClientProviders' preload effect depends on that identity, so it would
    // re-run continuously.
    const removeAuthCookiesRef = useRef(removeAuthCookies);
    removeAuthCookiesRef.current = removeAuthCookies;
    const [currencies, setCurrencies] = useState<AssetItem[]>([]);
    const [metals, setMetals] = useState<AssetItem[]>([]);
    const [balances, setBalances] = useState<BalancesMap>({});
    const [account, setAccount] = useState<{ name: string; type: string; number: string; displayId?: string }>({ name: '', type: '', number: '' });
    const [balanceHidden, setBalanceHidden] = useState(false);
    const [activeAssetSymbol, setActiveAssetSymbol] = useState<string | undefined>(undefined);
    const [activeAssetType, setActiveAssetType] = useState<string | undefined>(undefined);
    const [transactions, setTransactions] = useState<FinancialLedgerItem[]>([]);
    const [purposes, setPurposes] = useState<PurposeOption[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [isLoadingMetals, setIsLoadingMetals] = useState(false);
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionHasMore, setTransactionHasMore] = useState(false);
    const [transactionTotalPages, setTransactionTotalPages] = useState<number | null>(null);
    const [isLoadingPurposes, setIsLoadingPurposes] = useState(false);
    const preloadStartedRef = useRef(false);
    const previousUserKeyRef = useRef<string | null>(null);

    const resetStore = useCallback(() => {
        setBalanceHidden(false);
        setCurrencies([]);
        setMetals([]);
        setBalances({});
        setAccount({ name: '', type: '', number: '' });
        setActiveAssetSymbol(undefined);
        setActiveAssetType(undefined);
        setTransactions([]);
        setPurposes([]);
        setIsDataLoaded(false);
        setIsLoadingCurrencies(false);
        setIsLoadingMetals(false);
        setIsLoadingBalances(false);
        setIsLoadingTransactions(false);
        setIsLoadingMoreTransactions(false);
        setTransactionPage(0);
        setTransactionHasMore(false);
        setIsLoadingPurposes(false);
        preloadStartedRef.current = false;
    }, []);

    // Ensure account-scoped state never leaks across logout/login account switches.
    useEffect(() => {
        const userKey = userData?.user?.id || userData?.user?.phoneNumber || null;
        const previousUserKey = previousUserKeyRef.current;

        if (previousUserKey !== userKey) {
            resetStore();
            previousUserKeyRef.current = userKey;
        }
    }, [userData, resetStore]);

    // Preload all data during splash screen
    const preloadData = useCallback(
        async () => {
            // Prevent multiple preload calls
            if (preloadStartedRef.current || isDataLoaded) return;
            preloadStartedRef.current = true;

            try {
                // Token resolution is handled server-side via authCookieName
                // No need to pass explicit tokens — the bound action wrappers inject authCookieName

                // 1. Fetch supported assets (currencies + metals)
                setIsLoadingCurrencies(true);
                setIsLoadingMetals(true);
                const assetsRes = await api.banking.assets();

                if (!assetsRes.ok) {
                    // Prefer the status code. This previously had to uppercase the
                    // error string and look for 'UNAUTHENTICATED' or 'USER NOT
                    // FOUND', because the action layer surfaced no status — a
                    // reworded backend message would have silently stopped
                    // logging the user out. The string check is kept as a
                    // fallback for backends that return those as a 400.
                    const { status, message } = assetsRes.error;
                    const code = message.toUpperCase();
                    const isAuthFailure =
                        status === 401 ||
                        status === 403 ||
                        code === 'UNAUTHENTICATED' ||
                        (code.includes('USER') && code.includes('NOT') && code.includes('FOUND'));

                    if (isAuthFailure) {
                        // Only the non-401 cases actually reach here needing
                        // action: on a 401, apiFetch has already refreshed and —
                        // if the refresh token is dead too — run hardLogout.
                        // What it does NOT cover is an auth failure the backend
                        // reports as a 403 or a 400 "USER NOT FOUND", which is
                        // why this branch exists at all.
                        //
                        // This used to call an injected `handleUnauthenticated`
                        // from RDBContext — the seam a host app filled when this
                        // was an npm library. Nothing injected one, so it
                        // resolved to the default, which only console.warn'd, and
                        // a non-401 auth failure left the user sitting on a
                        // half-loaded home screen.
                        //
                        // removeAuthCookies, not a bare 'rdb:session-expired'
                        // dispatch: the event clears client state only, so the
                        // httpOnly cookies would survive and the next bootstrap
                        // would restore a session the backend rejects. This
                        // clears both, exactly like the manual sign-out path.
                        void removeAuthCookiesRef.current();
                    }
                    setIsLoadingCurrencies(false);
                    setIsLoadingMetals(false);
                    // Reset so preload can be retried after successful auth
                    preloadStartedRef.current = false;
                    return;
                }

                // Narrowed by the !assetsRes.ok guard above, so `.data` is safe
                // to read without optional chaining.
                const currencyList = assetsRes.data.currencies ?? [];
                const metalList = assetsRes.data.metals ?? [];
                setCurrencies(currencyList);
                setMetals(metalList);
                setIsLoadingCurrencies(false);
                setIsLoadingMetals(false);

                // 2. Fetch wallet balances + purposes in parallel
                setIsLoadingBalances(true);
                setIsLoadingPurposes(true);

                // Promise.all, not allSettled: both calls go through @/api now and
                // neither throws, so there is no rejection to settle. Failure is
                // carried in the result union instead, which is one check per call
                // rather than two.
                const [walletResult, purposesResult] = await Promise.all([
                    api.transactions.walletBalance({ currencySymbol: 'USD' }),
                    api.transfers.purposes(),
                ]);

                // Process wallet balances
                if (walletResult.ok) {
                    const first = walletResult.data.wallets?.[0];
                    setBalances(mapWalletBalances(walletResult.data));
                    setAccount({
                        name: first?.name || '',
                        type: first?.subtype || '',
                        number: first?.accountNumber || '',
                        displayId: first?.displayId,
                    });
                } else {
                    console.error('Error fetching wallet balances:', walletResult.error.message);
                }
                setIsLoadingBalances(false);

                // Process purposes
                if (purposesResult.ok) {
                    setPurposes(
                        purposesResult.data.map((p): PurposeOption => ({
                            id: p.id,
                            label: p.name,
                        })),
                    );
                }
                setIsLoadingPurposes(false);

                // 3. Fetch transactions from financial ledger
                setIsLoadingTransactions(true);
                const transactionsRes = await api.transactions.ledger({ page: 0, limit: 10 });
                if (transactionsRes.ok) {
                    setTransactions(transactionsRes.data.items ?? []);
                    setTransactionPage(0);
                    setTransactionHasMore(transactionsRes.data.hasNext ?? false);
                    setTransactionTotalPages(
                        typeof transactionsRes.data.totalPages === 'number'
                            ? transactionsRes.data.totalPages
                            : null,
                    );
                }
                setIsLoadingTransactions(false);

                setIsDataLoaded(true);
            } catch (error) {
                console.error('Preload error:', error);
                setIsLoadingCurrencies(false);
                setIsLoadingMetals(false);
                setIsLoadingBalances(false);
                setIsLoadingTransactions(false);
                setIsLoadingPurposes(false);
                // Reset so preload can be retried after successful auth
                preloadStartedRef.current = false;
            }
        },
        [isDataLoaded, userData],
    );

    useEffect(() => {
        console.log('Active asset symbol changed:', activeAssetSymbol);
    }, [activeAssetSymbol]);
    // Refresh transactions after actions like transfer (resets to page 0)
    const refreshTransactions = useCallback(async () => {
        setIsLoadingTransactions(true);
        try {
            const transactionsRes = await api.transactions.ledger({ page: 0, limit: 10 });
            if (transactionsRes.ok) {
                setTransactions(transactionsRes.data.items ?? []);
                setTransactionPage(0);
                setTransactionHasMore(transactionsRes.data.hasNext ?? false);
            }
        } catch (error) {
            console.error('Error refreshing transactions:', error);
        } finally {
            setIsLoadingTransactions(false);
        }
    }, []);

    // Load next page and append to existing transactions
    const loadMoreTransactions = useCallback(
        async () => {
            if (isLoadingMoreTransactions || !transactionHasMore) return;
            // لا تطلب إذا وصلنا لآخر صفحة
            if (transactionTotalPages !== null && transactionPage + 1 >= transactionTotalPages)
                return;
            setIsLoadingMoreTransactions(true);
            try {
                const nextPage = transactionPage + 1;
                const res = await api.transactions.ledger({ page: nextPage, limit: 10 });
                if (res.ok) {
                    setTransactions((prev) => [...prev, ...(res.data.items ?? [])]);
                    setTransactionPage(nextPage);
                    setTransactionHasMore(res.data.hasNext ?? false);
                    setTransactionTotalPages(
                        typeof res.data.totalPages === 'number' ? res.data.totalPages : null,
                    );
                }
            } catch (error) {
                console.error('Error loading more transactions:', error);
            } finally {
                setIsLoadingMoreTransactions(false);
            }
        },
        [isLoadingMoreTransactions, transactionHasMore, transactionPage, transactionTotalPages],
    );

    // Refresh balances after actions like transfer
    const refreshBalances = useCallback(
        async (currencySymbol?: string) => {
            setIsLoadingBalances(true);
            try {
                const symbolToRefresh = currencySymbol || activeAssetSymbol || 'USD';
                console.log('Refreshing balances for active asset symbol:', symbolToRefresh);
                const walletResult = await api.transactions.walletBalance({
                    currencySymbol: symbolToRefresh,
                });
                if (walletResult.ok) {
                    const first = walletResult.data.wallets?.[0];
                    setBalances(mapWalletBalances(walletResult.data));
                    setAccount({
                        name: first?.name || '',
                        type: first?.subtype || '',
                        number: first?.accountNumber || '',
                        displayId: first?.displayId,
                    });
                }
            } catch (error) {
                console.error('Error refreshing balances:', error);
            } finally {
                setIsLoadingBalances(false);
            }
        },
        [activeAssetSymbol],
    );

    return (
        <StoreContext.Provider
            value={{
                currencies,
                setCurrencies,
                metals,
                setMetals,
                balances,
                setBalances,
                account,
                setAccount,
                balanceHidden,
                setBalanceHidden,
                activeAssetSymbol,
                setActiveAssetSymbol,
                activeAssetType,
                setActiveAssetType,
                transactions,
                setTransactions,
                purposes,
                setPurposes,
                isDataLoaded,
                isLoadingCurrencies,
                isLoadingMetals,
                isLoadingBalances,
                isLoadingTransactions,
                isLoadingMoreTransactions,
                isLoadingPurposes,
                transactionHasMore,
                preloadData,
                refreshTransactions,
                loadMoreTransactions,
                refreshBalances,
                transactionTotalPages,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
