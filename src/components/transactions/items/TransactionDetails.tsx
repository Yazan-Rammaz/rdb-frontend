'use client';

import React from 'react';
import { useTranslation } from '@/context/I18nContext';
import SuccessReceipt from '@/components/QR/send/shared/SuccessReceipt';
import type { ReceiptData } from '@/components/QR/send/shared/receipt-types';
import type { FinancialLedgerItem } from '@/core/types';

interface TransactionDetailsProps {
    ledger: FinancialLedgerItem;
    onClose: () => void;
}

/**
 * The receipt for a transaction opened from a list (Home or Transactions).
 * It is the same receipt the user saw right after sending — with Download,
 * Share and Done — fed from the ledger row instead of a transfer result.
 */
const TransactionDetails: React.FC<TransactionDetailsProps> = ({ ledger, onClose }) => {
    const { t } = useTranslation();

    const getTypeLabel = () => {
        switch (ledger.ledgerType) {
            case 'ACCOUNT_TRANSFER':
                return ledger.direction === 'OUT'
                    ? t.home.transactions.transferSend
                    : t.home.transactions.transferReceive;
            case 'PAYMENT_REQUEST':
                return t.home.qr.paymentRequest;
            case 'DEPOSIT':
                return t.home.transactions.deposit;
            case 'WITHDRAWAL':
                return t.home.transactions.withdrawal;
            default:
                return typeof ledger.title === 'string' && ledger.title
                    ? ledger.title
                    : t.home.transactions.defaultTitle;
        }
    };

    const extraRows: ReceiptData['extraRows'] = [];
    if (ledger.feeAmount > 0) {
        extraRows.push({ label: t.common.fee, value: `${ledger.feeAmount} ${ledger.assetSymbol}` });
    }
    if (ledger.taxAmount > 0) {
        extraRows.push({ label: t.common.tax, value: `${ledger.taxAmount} ${ledger.assetSymbol}` });
    }
    const note = ledger.note || ledger.metadata?.note;
    if (note) {
        extraRows.push({ label: t.common.note, value: note });
    }

    const receipt: ReceiptData = {
        referenceCode: ledger.referenceId || ledger.id,
        createdAt: ledger.createdAt,
        status: ledger.status,
        direction: ledger.direction,
        // Both accounts are optional on the ledger until the backend always sends them.
        senderAccountNumber: ledger.senderAccount?.accountNumber || '—',
        senderMaskedName: ledger.senderAccount?.name ?? '',
        recipientAccountNumber: ledger.receiverAccount?.accountNumber || '—',
        recipientMaskedName: ledger.receiverAccount?.name ?? '',
        amount: String(ledger.amount),
        currency: ledger.assetSymbol,
        purposeLabel: ledger.metadata?.purposeName ?? '',
        inputMethod: ledger.metadata?.inputMethod,
        typeLabel: getTypeLabel(),
        extraRows,
    };

    return <SuccessReceipt data={receipt} onClose={onClose} />;
};

export default TransactionDetails;
