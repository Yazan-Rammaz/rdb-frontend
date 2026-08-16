'use client';
import { api } from '@/api';

import React, { useEffect, useRef, useState } from 'react';
import CountdownTimer from '@/components/QR/send/payment-request/CountdownTimer';
import { useStore } from '@/context/StoreContext';
import type { FinancialLedgerItem } from '@/core/types';

interface PendingPaymentTimerProps {
    requestCode: string;
    ledgerId: string;
}

/**
 * Shown as the subtitle of a PENDING payment request transaction item.
 * - Fetches the request via lookup to get expiresAt
 * - Shows a CountdownTimer while pending
 * - On expiry, calls lookup again to update the transaction status in the store
 */
const PendingPaymentTimer: React.FC<PendingPaymentTimerProps> = ({ requestCode, ledgerId }) => {
    const { setTransactions } = useStore();
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [isPermanent, setIsPermanent] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        api.paymentRequests
            .lookup(requestCode)
            .then((res) => {
                if (!res.ok) return;
                setIsPermanent(!!res.data.isPermanent);
                setExpiresAt(res.data.expiresAt ?? null);
            })
            // Redundant now — the API layer does not throw — but kept as a guard
            // against anything unexpected inside .then.
            .catch(() => {});
    }, [requestCode]);

    const handleExpired = () => {
        api.paymentRequests
            .lookup(requestCode)
            .then((res) => {
                if (!res.ok) return;
                // BUGFIX: this read `res.isPaid`, which PaymentRequestLookup does
                // not have — that field belongs to PaymentRequestData, the shape
                // the mock getPaymentRequest returns. Off an `any` it was always
                // undefined, so every expired-timer check marked the row EXPIRED
                // even when the request had actually been paid.
                const status = res.data.status === 'FULFILLED' ? 'COMPLETED' : 'EXPIRED';
                setTransactions((prev: FinancialLedgerItem[]) =>
                    prev.map((t) =>
                        t.id === ledgerId ? { ...t, status } : t,
                    ),
                );
            })
            .catch(() => {});
    };

    if (isPermanent) {
        return <span className="font-normal text-[#A0A0A0] text-xd-11">Always valid</span>;
    }

    if (!expiresAt) {
        return <span className="font-normal text-[#A0A0A0] text-xd-11">Waiting…</span>;
    }

    return (
        <CountdownTimer
            expiryTimestamp={expiresAt}
            onExpired={handleExpired}
            hideLabel
        />
    );
};

export default PendingPaymentTimer;
