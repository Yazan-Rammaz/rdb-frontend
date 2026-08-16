import React, { useState, useCallback, useEffect, useRef } from 'react';
import NavHome from './content/nav';
import BalanceHome from './content/balance';
import TransactionsHome from './content/transactions';
import { useStore } from '@/context/StoreContext';
import { api } from '@/api';
import CreatePaymentRequest from '../QR/receive/CreatePaymentRequest';
import PaymentRequestReview from '../QR/send/payment-request/PaymentRequestReview';
import TransactionDetails from '../transactions/items/TransactionDetails';
import BottomSheet from '../ui/BottomSheet';
import type { FinancialLedgerItem } from '@/core/types';

export const Home = () => {
    const {
        account,
        balances,
        currencies,
        setBalances,
        setCurrencies,
        activeAssetSymbol,
        setActiveAssetSymbol,
        activeAssetType,
        setActiveAssetType,
        transactions,
        setTransactions,
    } = useStore();

    // Per-symbol transaction cache: symbol → items
    const txCacheRef = useRef<Record<string, FinancialLedgerItem[]>>({});
    const [filteredTx, setFilteredTx] = useState<FinancialLedgerItem[] | null>(null);
    const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);

    useEffect(() => {
        if (!activeAssetSymbol) {
            setFilteredTx(null);
            return;
        }
        // Return cached result immediately
        if (txCacheRef.current[activeAssetSymbol]) {
            setFilteredTx(txCacheRef.current[activeAssetSymbol]);
            return;
        }
        // Fetch from API
        setIsLoadingFiltered(true);
        api.transactions
            .ledger({ page: 0, limit: 20, assetSymbol: activeAssetSymbol })
            .then((res) => {
                if (!res.ok) return;
                const items = res.data.items ?? [];
                txCacheRef.current[activeAssetSymbol] = items;
                setFilteredTx(items);
            })
            .finally(() => setIsLoadingFiltered(false));
    }, [activeAssetSymbol]);

    // When a WS transaction is prepended to global list, also prepend to active symbol cache
    const mountTimeRef = useRef(Date.now());
    const prevFirstIdRef = useRef<string | null>(transactions[0]?.id ?? null);
    const [newestWsTxId, setNewestWsTxId] = useState<string | null>(null);
    useEffect(() => {
        const firstId = transactions[0]?.id ?? null;
        const isNewPrepend = firstId !== prevFirstIdRef.current;

        if (isNewPrepend) {
            prevFirstIdRef.current = firstId;
            if (!firstId) return;
            // Ignore everything in the first 3 seconds after mount (initial load / hydration)
            if (Date.now() - mountTimeRef.current < 3000) return;

            const newest = transactions[0];
            setNewestWsTxId(newest.id);
            // Update cache for the affected symbol
            const sym = newest.assetSymbol;
            if (txCacheRef.current[sym]) {
                const cached = txCacheRef.current[sym];
                if (!cached.some((t) => t.id === newest.id)) {
                    txCacheRef.current[sym] = [newest, ...cached];
                }
            }
            // Update filtered view if currently showing this symbol
            if (activeAssetSymbol === sym) {
                setFilteredTx((prev) => {
                    if (!prev) return prev;
                    if (prev.some((t) => t.id === newest.id)) return prev;
                    return [newest, ...prev];
                });
            }
        } else {
            // In-place update (e.g. PENDING → COMPLETED): sync full item into filteredTx and cache
            const txById = new Map(transactions.map((t) => [t.id, t]));
            Object.keys(txCacheRef.current).forEach((sym) => {
                txCacheRef.current[sym] = txCacheRef.current[sym].map((c) => {
                    const updated = txById.get(c.id);
                    return updated && updated.updatedAt !== c.updatedAt ? updated : c;
                });
            });
            setFilteredTx((prev) => {
                if (!prev) return prev;
                let changed = false;
                const next = prev.map((c) => {
                    const updated = txById.get(c.id);
                    if (updated && updated.updatedAt !== c.updatedAt) {
                        changed = true;
                        return updated;
                    }
                    return c;
                });
                return changed ? next : prev;
            });
        }
    }, [transactions, activeAssetSymbol]);

    const displayTransactions = activeAssetSymbol ? (filteredTx ?? []) : transactions;

    const [showDeposit, setShowDeposit] = useState(false);
    const [activeRequestCode, setActiveRequestCode] = useState<string | null>(null);
    const [activeTransaction, setActiveTransaction] = useState<FinancialLedgerItem | null>(null);

    const handlePaymentRequestTap = useCallback((requestCode: string) => {
        setActiveRequestCode(requestCode);
    }, []);

    const handlePaymentRequestClose = useCallback(() => {
        setActiveRequestCode(null);
    }, []);

    const handleTransactionTap = useCallback((ledger: FinancialLedgerItem) => {
        setActiveTransaction(ledger);
    }, []);

    const handleTransactionClose = useCallback(() => {
        setActiveTransaction(null);
    }, []);

    return (
        <div className="flex flex-col items-start justify-start w-full h-full overflow-hidden">
            <div className="w-full shrink-0">
                <NavHome activeAssetSymbol={activeAssetSymbol} />
            </div>
            <div className="w-full shrink-0 ">
                <BalanceHome
                    setActiveAssetType={setActiveAssetType}
                    activeAssetType={activeAssetType}
                    balances={balances}
                    currencies={currencies}
                    setBalances={setBalances}
                    setCurrencies={setCurrencies}
                    activeAssetSymbol={activeAssetSymbol}
                    setActiveAssetSymbol={setActiveAssetSymbol}
                    setShowDeposit={setShowDeposit}
                />
            </div>
            <TransactionsHome
                transactions={displayTransactions}
                setTransactions={setTransactions}
                currencies={currencies}
                filterByCurrency={activeAssetSymbol}
                isLoadingFilter={isLoadingFiltered}
                newestWsTxId={newestWsTxId}
                onWsAnimDone={useCallback(() => setNewestWsTxId(null), [])}
                onPaymentRequestTap={handlePaymentRequestTap}
                onTransactionTap={handleTransactionTap}
            />
            <BottomSheet height="95dvh" open={showDeposit} onClose={() => setShowDeposit(false)}>
                <CreatePaymentRequest
                    account={account}
                    balances={balances}
                    activeAssetSymbol={activeAssetSymbol}
                />
            </BottomSheet>
            <BottomSheet
                height="95dvh"
                open={!!activeRequestCode}
                onClose={handlePaymentRequestClose}
            >
                {activeRequestCode && (
                    <PaymentRequestReview
                        requestCode={activeRequestCode}
                        onDone={handlePaymentRequestClose}
                        onBack={handlePaymentRequestClose}
                    />
                )}
            </BottomSheet>
            <BottomSheet
                height="95dvh"
                open={!!activeTransaction}
                onClose={handleTransactionClose}
            >
                {activeTransaction && (
                    <TransactionDetails
                        ledger={activeTransaction}
                        onClose={handleTransactionClose}
                    />
                )}
            </BottomSheet>
        </div>
    );
};
