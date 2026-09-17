'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { usePaymentRequestAPI } from '@/hooks/usePaymentRequestAPI';
import { isMerchantPayable } from '@/api/helpers/paymentRequests';
import Input from '@/components/ui/Input';
import CountdownTimer from '../payment-request/CountdownTimer';
import SendButton from '../payment-request/SendButton';
import LogoIcon from '@/assets/icons/home/qr/title.svg';
import type { MerchantPaymentLookup, MerchantPayResponse } from '@/core/types';

interface MerchantPaymentReviewProps {
    /** Code to look up — from a scanned shop QR or an `mrcpay` deep link. */
    code?: string;
    /** An order already fetched elsewhere. Supplied instead of `code`, never fetched again. */
    merchant?: MerchantPaymentLookup;
    onDone: () => void;
    onBack: () => void;
}

/**
 * Paying a shop.
 *
 * Deliberately not folded into PaymentRequestReview even though both start from
 * a scanned code: a merchant order settles through a different endpoint
 * (`merchant/payments/{id}/pay`, not `payment-requests/{id}/fulfill`), answers
 * with a receipt rather than a request, and shows a shop and an order number
 * where the other shows a person. Sharing one component would mean two payment
 * paths interleaved behind `kind` checks in every branch.
 */
const MerchantPaymentReview: React.FC<MerchantPaymentReviewProps> = ({
    code,
    merchant: prefetched,
    onDone,
    onBack,
}) => {
    const { t, language } = useTranslation();
    const { toast } = useToast();
    const { refreshTransactions } = useStore();
    const api = usePaymentRequestAPI();

    const apiRef = useRef(api);
    apiRef.current = api;
    const toastRef = useRef(toast);
    toastRef.current = toast;

    const [order, setOrder] = useState<MerchantPaymentLookup | null>(prefetched ?? null);
    const [loading, setLoading] = useState(!prefetched);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [receipt, setReceipt] = useState<MerchantPayResponse | null>(null);

    /**
     * Fixed for the life of this screen, so every retry of the same order —
     * including the automatic ones inside usePaymentRequestAPI — carries the
     * same key. Regenerating it per attempt is how a customer gets charged
     * twice for one basket.
     */
    const idempotencyKeyRef = useRef<string>(
        `mp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    );

    const cancelledRef = useRef(false);

    const fetchOrder = useCallback(async () => {
        if (!code) return;

        cancelledRef.current = false;
        setLoading(true);
        setFetchError(null);

        const result = await apiRef.current.lookupPaymentRequest(code);
        if (cancelledRef.current) return;

        if ('error' in result) {
            setFetchError(result.error);
            setLoading(false);
            return;
        }

        // The code resolved to a person's request, not a shop's order. Only
        // reachable through a hand-typed or stale link, since a scan routes
        // on the QR shape first — but paying it here would hit the wrong
        // endpoint, so refuse rather than guess.
        if (result.kind !== 'MERCHANT') {
            setFetchError(t.home.qr.messages.invalidQrCode);
            setLoading(false);
            return;
        }

        setOrder(result.merchant);
        setLoading(false);
    }, [code, t]);

    useEffect(() => {
        if (prefetched || !code) return;
        void fetchOrder();
        return () => {
            cancelledRef.current = true;
        };
    }, [code, prefetched, fetchOrder]);

    const handlePay = useCallback(async () => {
        if (!order || isPaying) return;
        setIsPaying(true);

        const result = await apiRef.current.payMerchantPayment({
            id: order.id,
            idempotencyKey: idempotencyKeyRef.current,
        });

        setIsPaying(false);
        if ('error' in result) return; // the hook has already toasted

        setReceipt(result);
        // The payment shows up in the ledger — pull it in now so going back to
        // the transactions list does not show a stale one.
        void refreshTransactions?.();
    }, [order, isPaying, refreshTransactions]);

    // ─── States before the order can be shown ────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full">
                <p className="text-4 font-light text-text">{t.common.loading}</p>
            </div>
        );
    }

    // Same shape as the payment-request screen's failure state — a customer who
    // followed a dead shop link should land on the screen they would get for any
    // other unreadable code, not on something that looks like a different app.
    if (fetchError || !order) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <p className="text-[13px] text-[#FF4D4D]">
                        {fetchError || t.home.qr.messages.invalidQrCode}
                    </p>
                    {/* Retry only helps when there is a code to re-fetch; a
                        handed-off order that failed has nothing to retry. */}
                    {code && (
                        <button
                            onClick={() => void fetchOrder()}
                            className="text-[13px] text-[#388CFF] font-medium underline cursor-pointer"
                        >
                            {t.common.retry}
                        </button>
                    )}
                    <button
                        onClick={onBack}
                        className="text-[13px] text-[#8D8D8D] mt-1 cursor-pointer"
                    >
                        {t.common.accessibility.goBack}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Paid ────────────────────────────────────────────────────────────────

    if (receipt) {
        return (
            <div className="flex flex-col items-center w-full h-full overflow-y-auto pt-2 pb-6">
                <div className="relative w-25 h-7 shrink-0">
                    <Image src={LogoIcon} alt="" fill className="object-contain" />
                </div>

                <div className="flex flex-col items-center gap-1 mt-6">
                    <p className="text-[22px] font-semibold text-text">
                        {receipt.amount} {receipt.assetSymbol}
                    </p>
                    <p className="text-4 font-light text-text">{receipt.merchantName}</p>
                </div>

                <div className="px-xd-25 w-full mt-6 space-y-0">
                    <Input
                        containerClassName="bg-transparent w-full"
                        hideRequired
                        reviewMode
                        disabled
                        readOnly
                        label={t.merchantPayment.orderRef}
                        value={receipt.orderRef}
                    />
                    <Input
                        containerClassName="bg-transparent w-full"
                        hideRequired
                        reviewMode
                        disabled
                        readOnly
                        label={t.merchantPayment.receiptNumber}
                        value={receipt.receiptNumber}
                    />
                    <Input
                        containerClassName="bg-transparent w-full"
                        hideRequired
                        reviewMode
                        disabled
                        readOnly
                        label={t.merchantPayment.paidAt}
                        value={formatPaidAt(receipt.paidAt, language)}
                    />
                </div>

                <div className="flex flex-col items-center gap-3 w-full px-xd-25 mt-8">
                    {/*
                      The shop's own "thank you" page. Opened in a new tab and
                      severed with noopener: it is a third-party URL handed to us
                      in an API response, and it must not get a handle on the
                      banking tab it was launched from.
                    */}
                    {receipt.successUrl && (
                        <a
                            href={receipt.successUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full max-w-[320px] py-3.5 rounded-xl bg-[#388CFF]/10 text-[#388CFF] text-[14px] font-semibold text-center"
                        >
                            {t.merchantPayment.backToStore}
                        </a>
                    )}
                    <button
                        onClick={onDone}
                        className="w-full max-w-[320px] py-3.5 rounded-xl text-[14px] font-semibold text-text cursor-pointer"
                    >
                        {t.common.done}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Ready to pay ────────────────────────────────────────────────────────

    const payable = isMerchantPayable(order) && !isExpired;
    const description = order.description?.[language === 'ar' ? 'ar' : 'en'] ?? order.description?.en;
    const hasFee = !!order.feeAmount && Number(order.feeAmount) > 0;

    return (
        <div className="flex flex-col items-center w-full h-full overflow-y-auto pt-2">
            <div className="relative w-25 h-7 shrink-0">
                <Image src={LogoIcon} alt="" fill className="object-contain" />
            </div>

            {/* The shop and what it is charging for — the two things worth
                checking before paying, so they lead. */}
            <div className="flex flex-col items-center gap-1 mt-5 px-xd-25 text-center">
                <p className="text-4 font-light text-text">{order.merchantName}</p>
                <p className="text-[26px] font-semibold text-text">
                    {order.amount} {order.assetSymbol}
                </p>
                {hasFee && (
                    <p className="text-[12px] font-light text-[#888888]">
                        {t.merchantPayment.feeLabel}: {order.feeAmount} {order.assetSymbol}
                    </p>
                )}
                {description && (
                    <p className="text-[13px] font-light text-[#666666] mt-1">{description}</p>
                )}
            </div>

            <div className="px-xd-25 w-full mt-5 space-y-0">
                <Input
                    containerClassName="bg-transparent w-full"
                    hideRequired
                    reviewMode
                    disabled
                    readOnly
                    label={t.merchantPayment.orderRef}
                    value={order.orderRef}
                />
            </div>

            {order.expiresAt && !isExpired && (
                <div className="w-full px-xd-25 mt-2">
                    <CountdownTimer
                        expiryTimestamp={order.expiresAt}
                        onExpired={() => setIsExpired(true)}
                    />
                </div>
            )}

            {!payable && (
                <p className="text-[13px] font-medium text-[#FF4D4D] mt-4 px-xd-25 text-center">
                    {isExpired || order.status === 'EXPIRED'
                        ? t.merchantPayment.expired
                        : t.merchantPayment.notPayable}
                </p>
            )}

            <div className="mt-auto w-full">
                <SendButton
                    isExpired={!payable}
                    isSending={isPaying}
                    isDisabled={!payable}
                    onSend={handlePay}
                />
            </div>
        </div>
    );
};

function formatPaidAt(iso: string, language: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(language === 'ar' ? 'ar' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default MerchantPaymentReview;
