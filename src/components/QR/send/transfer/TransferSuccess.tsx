'use client';

import React from 'react';
import SuccessReceipt from '../shared/SuccessReceipt';
import type { ReceiptData } from '../shared/SuccessReceipt';
import type { TransferResult } from '@/core/types/transfer';
import { useAuth } from '@/context/AuthContext';

interface TransferSuccessProps {
    transferResult: TransferResult;
    senderAccountNumber: string;
    senderMaskedName: string;
    recipientAccountNumber: string;
    recipientMaskedName: string;
    amount: string;
    currency: string;
    purposeLabel: string;
    inputMethod?: 'MANUAL' | 'QR';
    onClose: () => void;
}

const TransferSuccess: React.FC<TransferSuccessProps> = ({
    transferResult,
    senderAccountNumber,
    senderMaskedName,
    recipientAccountNumber,
    recipientMaskedName,
    amount,
    currency,
    purposeLabel,
    inputMethod,
    onClose,
}) => {
    const { userData } = useAuth();
    const senderFirstName = userData?.firstName || userData?.user?.firstName;
    const receiptData: ReceiptData = {
        referenceCode: transferResult.transferId,
        createdAt: transferResult.createdAt,
        status: transferResult.status,
        senderAccountNumber,
        senderMaskedName,
        senderFirstName,
        recipientAccountNumber,
        recipientMaskedName,
        amount,
        currency,
        purposeLabel: purposeLabel || transferResult.purpose,
        inputMethod,
    };

    return <SuccessReceipt data={receiptData} onClose={onClose} />;
};

export default TransferSuccess;
