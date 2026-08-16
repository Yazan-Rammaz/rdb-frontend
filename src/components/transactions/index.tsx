import React, { useState, useCallback } from 'react';
import { useStore } from '@/context/StoreContext';
import CreatePaymentRequest from '../QR/receive/CreatePaymentRequest';
import PaymentRequestReview from '../QR/send/payment-request/PaymentRequestReview';
import TransactionDetails from './items/TransactionDetails';
import BottomSheet from '../ui/BottomSheet';
import type { FinancialLedgerItem } from '@/core/types';
import TransactionsHome from '../home/content/transactions';

export const Transactions = () => {
    const {
        currencies,
        transactions,
        setTransactions,
    } = useStore();
    const [activeRequestCode, setActiveRequestCode] = useState<string | null>(null);
    const [activeTransaction, setActiveTransaction] = useState<FinancialLedgerItem | null>(null);

    const handlePaymentRequestTap = useCallback((requestCode: string) => {
        setActiveRequestCode(requestCode);
    }, []);

    const handleTransactionTap = useCallback((ledger: FinancialLedgerItem) => {
        setActiveTransaction(ledger);
    }, []);

    const handleTransactionClose = useCallback(() => {
        setActiveTransaction(null);
    }, []);

    return (
        <div className="flex mt-4 flex-col items-start justify-start w-full h-full overflow-hidden">
            <TransactionsHome
                transactions={transactions}
                setTransactions={setTransactions}
                currencies={currencies}
                onPaymentRequestTap={handlePaymentRequestTap}
                onTransactionTap={handleTransactionTap}
            />
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
