'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { usePaymentRequestAPI } from '@/hooks/usePaymentRequestAPI';
import { isMerchantPayable, merchantDescription } from '@/api/helpers/paymentRequests';
import { formatMoneyString } from '../../shared/formatMoneyString';
import { formatDateTime } from '../../shared/formatDateTime';
import DetailRow from '../../shared/DetailRow';
import { ActionButton } from '../../shared/ActionButton';
import SenderCard from '../transfer/SenderCard';
import CountdownTimer from '../payment-request/CountdownTimer';
import SendButton from '../payment-request/SendButton';
import { QRCodeDisplay } from '../shared/QRCodeDisplay';
import TitleIcon from '@/assets/icons/home/qr/sendT.svg';
import OrderIcon from '@/assets/icons/home/orderinvoice.svg';
import TransferDoneIcon from '@/assets/icons/home/transfer/transferdone.svg';
import SuccessIcon from '@/assets/icons/home/transfer/success.svg';
import DoneIcon from '@/assets/icons/home/transfer/done.svg';
import TrydosIcon from '@/assets/icons/trydos.svg';
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
 *
 * It does borrow that screen's furniture wholesale — the same title block,
 * SenderCard, DetailRow list and SendButton — because to the customer this is
 * the same act as any other payment, and a shop scan that landed somewhere
 * visually unrelated read as a different app.
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

    /**
     * The receipt tints the sheet green, the same way a completed transfer
     * does. Restored on unmount so the sheet is not left green for whatever
     * opens in it next.
     */
    useEffect(() => {
        if (!receipt) return;
        const bottomSheet = document.getElementById('bottom-sheet');
        if (!bottomSheet) return;

        const previousBg = bottomSheet.style.backgroundColor;
        bottomSheet.style.backgroundColor = '#F4FFFA';
        return () => {
            bottomSheet.style.backgroundColor = previousBg;
        };
    }, [receipt]);

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
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#388CFF] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] text-[#8D8D8D]">{t.merchantPayment.loading}</p>
                </div>
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

    const description = merchantDescription(order, language);

    // ─── Paid ────────────────────────────────────────────────────────────────

    if (receipt) {
        return (
            <div className="flex flex-col relative bg-[#F4FFFA] h-full items-center w-full overflow-y-auto pb-xd-80">
                <div className="mt-xd-16 mb-xd-12">
                    <Image src={TransferDoneIcon} alt="" className="size-xd-40" />
                </div>

                <h2 className="text-xd-13 text-[#1D1D1D] font-medium text-center mb-xd-16 uppercase">
                    {t.merchantPayment.paidSuccess}
                </h2>

                <div className="mb-xd-8">
                    <QRCodeDisplay value={receipt.receiptNumber} bg="#F4FFFA" size={120} />
                </div>

                <p className="text-xd-13 text-[#1D1D1D] font-medium mb-xd-24">
                    {receipt.receiptNumber}
                </p>

                <div className="w-xd-370 space-y-xd-16">
                    <DetailRow
                        label={t.merchantPayment.merchant}
                        value={receipt.merchantName}
                        icon={
                            <Image
                                src={OrderIcon}
                                alt=""
                                width={14}
                                height={14}
                                className="size-xd-14 object-contain"
                            />
                        }
                    />

                    {description && (
                        <DetailRow label={t.merchantPayment.orderDetails} value={description} />
                    )}

                    <div className="grid grid-cols-2 gap-y-xd-16 gap-x-xd-48">
                        <DetailRow
                            label={t.merchantPayment.amountToPay}
                            value={`${formatMoneyString(receipt.amount)} ${receipt.assetSymbol}`}
                            bold
                        />
                        <DetailRow
                            label={t.merchantPayment.receiptNumber}
                            value={receipt.receiptNumber}
                        />
                        <DetailRow
                            label={t.merchantPayment.paidAt}
                            value={formatDateTime(receipt.paidAt, language)}
                        />
                        <div>
                            <p className="text-xd-11 text-[#8D8D8D] font-medium">
                                {t.merchantPayment.status}
                            </p>
                            <div className="flex items-center gap-xd-4">
                                <span className="text-xd-13 text-[#1D1D1D] mt-xd-5 font-medium">
                                    {statusLabel(receipt.status, t.merchantPayment.statusValue)
                                        .label}
                                </span>
                                <Image
                                    src={SuccessIcon}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="size-xd-16"
                                />
                            </div>
                        </div>
                    </div>

                    <OrderReference label={t.merchantPayment.orderRef} value={receipt.orderRef} />
                </div>

                <div className="mt-xd-24 mb-xd-16">
                    <Image
                        alt="trydos"
                        width={80}
                        height={25}
                        src={TrydosIcon}
                        className="w-xd-80 h-xd-25"
                    />
                </div>

                <div className="flex bg-[#F4FFFA] absolute bottom-0 max-w-xd-370 items-center justify-around w-full m-xd-16 pt-xd-16 border-t border-gray-100">
                    <ActionButton icon={DoneIcon} label={t.common.done} onClick={onDone} bounceOnClick />
                    {/*
                      The shop's own "thank you" page. Opened in a new tab and
                      severed with noopener: it is a third-party URL handed to us
                      in an API response, and it must not get a handle on the
                      banking tab it was launched from. An anchor rather than an
                      ActionButton for exactly that reason — `rel` is what does
                      the severing.
                    */}
                    {receipt.successUrl && (
                        <a
                            href={receipt.successUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex cursor-pointer flex-col items-center gap-xd-5 transition-opacity hover:opacity-70 active:opacity-50"
                        >
                            <Image
                                width={20}
                                height={20}
                                src={OrderIcon}
                                alt=""
                                className="size-xd-20 object-contain"
                            />
                            <span className="text-xd-11 leading-xd-16 font-normal text-[#1D1D1D]">
                                {t.merchantPayment.backToStore}
                            </span>
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // ─── Ready to pay ────────────────────────────────────────────────────────

    const payable = isMerchantPayable(order) && !isExpired;
    const hasFee = !!order.feeAmount && Number(order.feeAmount) > 0;
    const status = statusLabel(
        isExpired ? 'EXPIRED' : order.status,
        t.merchantPayment.statusValue,
    );

    return (
        <div className="w-full h-full overflow-y-auto relative flex flex-col">
            <div className="w-full relative flex flex-col flex-1">
                {/* Header */}
                <div className="flex flex-col items-center mb-4 pt-2">
                    <div className="mb-3">
                        <Image src={TitleIcon} alt="" width={40} height={40} />
                    </div>
                    <h2 className="text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase">
                        {t.merchantPayment.title}
                    </h2>
                </div>

                <SenderCard selectedAssetSymbol={order.assetSymbol} />

                {/* Pay To divider */}
                <p className="text-[13px] text-[#1D1D1D] font-medium text-center mt-4 mb-2">
                    {t.merchantPayment.payTo}
                </p>

                {/* The order in the customer's terms — who is charging, for what,
                    and how much. The ids that identify it to the two backends sit
                    underneath, where they belong. */}
                <div className="flex items-center justify-center w-full">
                    <div className="overflow-auto pb-40 w-xd-370 space-y-1">
                        <DetailRow
                            bg="#F7F7F7"
                            label={t.merchantPayment.merchant}
                            value={order.merchantName}
                            icon={
                                <Image
                                    src={OrderIcon}
                                    alt=""
                                    width={14}
                                    height={14}
                                    className="object-contain"
                                />
                            }
                        />

                        {description && (
                            <DetailRow
                                bg="#F7F7F7"
                                label={t.merchantPayment.orderDetails}
                                value={description}
                            />
                        )}

                        <DetailRow
                            bg="#F7F7F7"
                            label={t.merchantPayment.amountToPay}
                            value={`${formatMoneyString(order.amount)} ${order.assetSymbol}`}
                            bold
                        />

                        {hasFee && (
                            <DetailRow
                                bg="#F7F7F7"
                                label={t.merchantPayment.feeLabel}
                                value={`${formatMoneyString(order.feeAmount)} ${order.assetSymbol}`}
                            />
                        )}

                        <DetailRow
                            bg="#F7F7F7"
                            label={t.merchantPayment.status}
                            value={status.label}
                            valueColor={status.color}
                        />

                        <OrderReference
                            bg="#F7F7F7"
                            label={t.merchantPayment.orderRef}
                            value={order.orderRef}
                        />

                        {order.expiresAt && !isExpired && (
                            <CountdownTimer
                                expiryTimestamp={order.expiresAt}
                                onExpired={() => setIsExpired(true)}
                            />
                        )}

                        {!payable && (
                            <div className="bg-[#FFF0F0] border border-[#FF4D4D]/20 rounded-lg p-3 mt-2">
                                <p className="text-[12px] text-[#FF4D4D]">
                                    {isExpired || order.status === 'EXPIRED'
                                        ? t.merchantPayment.expired
                                        : t.merchantPayment.notPayable}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1" />

                <div className="absolute bottom-0 w-full bg-background">
                    <SendButton
                        isExpired={isExpired || order.status === 'EXPIRED'}
                        isSending={isPaying}
                        isDisabled={!payable}
                        onSend={() => void handlePay()}
                        label={t.merchantPayment.payButton}
                        sendingLabel={t.merchantPayment.payingButton}
                    />
                </div>
            </div>
        </div>
    );
};

/**
 * The shop's order reference.
 *
 * Its own row rather than a DetailRow because of what shops actually send: a
 * readable order number from some, a 36-character UUID from others. At
 * DetailRow's size a UUID wraps over two lines and reads as the loudest thing
 * on a payment screen, which is backwards — it is the one field the customer
 * never needs to check. Shown small and complete: quiet, still quotable to
 * support, and never truncated.
 */
function OrderReference({ label, value, bg }: { label: string; value: string; bg?: string }) {
    if (!value) return null;
    return (
        <div className="rounded-xd-15 py-xd-8" style={{ backgroundColor: bg || 'transparent' }}>
            <p className="text-xd-11 text-[#8D8D8D]">{label}</p>
            <p className="text-xd-11 text-[#8D8D8D] mt-xd-4 break-all">{value}</p>
        </div>
    );
}

/** Backend status → what it is called on screen, and the colour that says it. */
function statusLabel(
    status: string | undefined,
    values: { pending: string; paid: string; expired: string; cancelled: string },
): { label: string; color: string } {
    switch (status?.toUpperCase()) {
        case 'PENDING':
            return { label: values.pending, color: '#F59E0B' };
        case 'PAID':
        case 'COMPLETED':
        case 'SUCCEEDED':
            return { label: values.paid, color: '#22C55E' };
        case 'EXPIRED':
            return { label: values.expired, color: '#FF4D4D' };
        case 'CANCELLED':
        case 'CANCELED':
            return { label: values.cancelled, color: '#FF4D4D' };
        // An unrecognised status is shown as sent rather than swallowed — a
        // customer seeing a word the app does not know is better than a
        // payment screen that quietly omits the state it is in.
        default:
            return { label: status || '', color: '#1D1D1D' };
    }
}

export default MerchantPaymentReview;
