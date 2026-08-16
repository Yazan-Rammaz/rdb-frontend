'use client';

import React, { useEffect, useRef, useState } from 'react';
import CountdownTimer from '@/components/QR/send/payment-request/CountdownTimer';
import { useActions } from '@/hooks/useActions';
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
    const actions = useActions();
    const { setTransactions } = useStore();
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [isPermanent, setIsPermanent] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        actions.paymentRequests
            .lookupPaymentRequest({ code: requestCode })
            .then((res: any) => {
                if (!res || 'error' in res) return;
                setIsPermanent(!!res.isPermanent);
                setExpiresAt(res.expiresAt ?? null);
            })
            .catch(() => {});
    }, [requestCode]);

    const handleExpired = () => {
        actions.paymentRequests
            .lookupPaymentRequest({ code: requestCode })
            .then((res: any) => {
                if (!res || 'error' in res) return;
                const status = res.isPaid ? 'COMPLETED' : 'EXPIRED';
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
