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
    preloadData: (actions?: any, handleUnauthenticated?: () => void) => Promise<void>;
    // Refresh functions for updating data after actions
    refreshTransactions: (actions?: any) => Promise<void>;
    loadMoreTransactions: (actions?: any) => Promise<void>;
    refreshBalances: (actions?: any, currencySymbol?: string) => Promise<void>;
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
    const { userData } = useAuth();
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
        async (actions?: any, handleUnauthenticated?: () => void) => {
            // Prevent multiple preload calls
            if (preloadStartedRef.current || isDataLoaded) return;
            preloadStartedRef.current = true;

            try {
                // Token resolution is handled server-side via authCookieName
                // No need to pass explicit tokens — the bound action wrappers inject authCookieName

                // 1. Fetch supported assets (currencies + metals)
                setIsLoadingCurrencies(true);
                setIsLoadingMetals(true);
                const assetsRes = await actions.banking.getSupportedAssets({});

                if (!assetsRes || 'error' in assetsRes) {
                    const errorCode = assetsRes?.error?.toUpperCase() || '';
                    if (
                        (errorCode === 'UNAUTHENTICATED' ||
                            (errorCode.includes('USER') &&
                                errorCode.includes('NOT') &&
                                errorCode.includes('FOUND'))) &&
                        handleUnauthenticated
                    ) {
                        handleUnauthenticated();
                    }
                    setIsLoadingCurrencies(false);
                    setIsLoadingMetals(false);
                    // Reset so preload can be retried after successful auth
                    preloadStartedRef.current = false;
                    return;
                }

                const currencyList = assetsRes?.currencies || [];
                const metalList = assetsRes?.metals || [];
                setCurrencies(currencyList);
                setMetals(metalList);
                setIsLoadingCurrencies(false);
                setIsLoadingMetals(false);

                // 2. Fetch wallet balances + purposes in parallel
                setIsLoadingBalances(true);
                setIsLoadingPurposes(true);

                const [walletResult, purposesResult] = await Promise.allSettled([
                    actions.transactions.GetWalletBalance({ currencySymbol: 'USD' }),
                    // Migrated to @/api. It never throws, so the allSettled
                    // wrapper is redundant for this one — kept only so the two
                    // calls still run in parallel without restructuring the
                    // wallet branch below.
                    api.transfers.purposes(),
                ]);

                // Process wallet balances
                if (walletResult.status === 'fulfilled') {
                    setBalances(mapWalletBalances(walletResult.value));
                    setAccount({
                        name: walletResult.value?.wallets?.[0]?.name || '',
                        type: walletResult.value?.wallets?.[0]?.subtype || '',
                        number: walletResult.value?.wallets?.[0]?.accountNumber || '',
                        displayId: walletResult.value?.wallets?.[0]?.displayId,
                    });
                } else {
                    console.error('Error fetching wallet balances:', walletResult.reason);
                }
                setIsLoadingBalances(false);

                // Process purposes. Two checks rather than one: allSettled's
                // `fulfilled`, then the API layer's own ok/error union.
                if (purposesResult.status === 'fulfilled' && purposesResult.value.ok) {
                    setPurposes(
                        purposesResult.value.data.map((p): PurposeOption => ({
                            id: p.id,
                            label: p.name,
                        })),
                    );
                }
                setIsLoadingPurposes(false);

                // 3. Fetch transactions from financial ledger
                setIsLoadingTransactions(true);
                const transactionsRes = await actions.transactions.GetFinancialLedger({
                    page: 0,
                    limit: 10,
                });
                if (transactionsRes && !('error' in transactionsRes)) {
                    setTransactions(transactionsRes.items || []);
                    setTransactionPage(0);
                    setTransactionHasMore(transactionsRes.hasNext ?? false);
                    setTransactionTotalPages(
                        typeof transactionsRes.totalPages === 'number'
                            ? transactionsRes.totalPages
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
    const refreshTransactions = useCallback(async (actions?: any) => {
        if (!actions) return;
        setIsLoadingTransactions(true);
        try {
            const transactionsRes = await actions.transactions.GetFinancialLedger({
                page: 0,
                limit: 10,
            });
            if (transactionsRes && !('error' in transactionsRes)) {
                setTransactions(transactionsRes.items || []);
                setTransactionPage(0);
                setTransactionHasMore(transactionsRes.hasNext ?? false);
            }
        } catch (error) {
            console.error('Error refreshing transactions:', error);
        } finally {
            setIsLoadingTransactions(false);
        }
    }, []);

    // Load next page and append to existing transactions
    const loadMoreTransactions = useCallback(
        async (actions?: any) => {
            if (!actions || isLoadingMoreTransactions || !transactionHasMore) return;
            // لا تطلب إذا وصلنا لآخر صفحة
            if (transactionTotalPages !== null && transactionPage + 1 >= transactionTotalPages)
                return;
            setIsLoadingMoreTransactions(true);
            try {
                const nextPage = transactionPage + 1;
                const res = await actions.transactions.GetFinancialLedger({
                    page: nextPage,
                    limit: 10,
                });
                if (res && !('error' in res)) {
                    setTransactions((prev) => [...prev, ...(res.items || [])]);
                    setTransactionPage(nextPage);
                    setTransactionHasMore(res.hasNext ?? false);
                    setTransactionTotalPages(
                        typeof res.totalPages === 'number' ? res.totalPages : null,
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
        async (actions?: any, currencySymbol?: string) => {
            if (!actions) return;
            setIsLoadingBalances(true);
            try {
                const symbolToRefresh = currencySymbol || activeAssetSymbol || 'USD';
                console.log('Refreshing balances for active asset symbol:', symbolToRefresh);
                const walletResult = await actions.transactions.GetWalletBalance({
                    currencySymbol: symbolToRefresh,
                });
                if (walletResult && !('error' in walletResult)) {
                    setBalances(mapWalletBalances(walletResult));
                    setAccount({
                        name: walletResult?.wallets?.[0]?.name || '',
                        type: walletResult?.wallets?.[0]?.subtype || '',
                        number: walletResult?.wallets?.[0]?.accountNumber || '',
                        displayId: walletResult?.wallets?.[0]?.displayId,
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
