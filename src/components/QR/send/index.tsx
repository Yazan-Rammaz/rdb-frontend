'use client';

import React, { useState, useEffect } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import QrScannerContent from './Scan';
import SendChoose from './SendChoose';
import TransferSend from './transfer';
import PaymentRequestReview from './payment-request/PaymentRequestReview';
import MerchantPaymentReview from './merchant/MerchantPaymentReview';
import type { ParsedQR } from './types';
import type { MerchantPaymentLookup } from '@/core/types';
import { useScanner } from '@/context/ScannerContext';
import { useTranslation } from '@/context/I18nContext';

type Page =
    | 'scan'
    | 'sendChoose'
    | 'transferSend'
    | 'paymentRequest'
    | 'paymentRequestView'
    | 'merchantPayment';

interface QrScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (value: string) => void;
    parsedQR?: ParsedQR | null;
    /** For requester mode: open directly to payment request review with this code */
    paymentRequestCode?: string | null;
    /** Deep link (/home?mrcpay=…): open directly to the merchant order with this code */
    merchantCode?: string | null;
}

const PAGES: Page[] = [
    'scan',
    'sendChoose',
    'transferSend',
    'paymentRequest',
    'paymentRequestView',
    'merchantPayment',
];
const SLIDE_TRANSITION = 'transform 0.38s cubic-bezier(0.33, 1, 0.68, 1)';

const QrScanner: React.FC<QrScannerProps> = ({
    open,
    onClose,
    onScan,
    parsedQR,
    paymentRequestCode,
    merchantCode,
}) => {
    const [page, setPage] = useState<Page>('scan');
    const [qrPrefilledTransfer, setQrPrefilledTransfer] = useState(false);
    // Set when a PAYREQ code turns out to be a merchant order: the review
    // screen has already fetched it, so hand the result over rather than
    // making the merchant screen look the same code up again.
    const [handedOffMerchant, setHandedOffMerchant] = useState<MerchantPaymentLookup | null>(null);
    const { setScannerNav, isTransferScan } = useScanner();
    const { t, rtl } = useTranslation();

    // Register page navigation fns so openScannerWithCallback can control this instance
    useEffect(() => {
        setScannerNav({
            toScan: () => setPage('scan'),
            toTransfer: () => setPage('transferSend'),
            toPaymentRequest: () => setPage('paymentRequest'),
        });
        return () => setScannerNav({});
    }, [setScannerNav]);

    React.useEffect(() => {
        if (merchantCode) {
            // Deep link: the customer arrived on /home?mrcpay=… rather than scanning
            setQrPrefilledTransfer(false);
            setPage('merchantPayment');
        } else if (paymentRequestCode) {
            // Requester mode: opened from pending transaction tap
            setQrPrefilledTransfer(false);
            setPage('paymentRequestView');
        } else if (parsedQR?.merchantCode) {
            // Scanned a shop's QR
            setQrPrefilledTransfer(false);
            setPage('merchantPayment');
        } else if (parsedQR) {
            // Payment request QR detected by PAYREQ: prefix — carries requestCode + requesterAccount
            const isPaymentRequest = !!parsedQR.requestCode && !!parsedQR.requesterAccount;
            if (isPaymentRequest) {
                setQrPrefilledTransfer(false);
                setPage('paymentRequest');
            } else {
                setQrPrefilledTransfer(true);
                setPage('transferSend');
            }
        } else {
            setQrPrefilledTransfer(false);
            setPage('scan');
        }
    }, [parsedQR, paymentRequestCode, merchantCode, open]);

    const pageIndex = PAGES.indexOf(page);
    const navigate = (to: Page) => setPage(to);

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setPage('scan');
            setQrPrefilledTransfer(false);
            setHandedOffMerchant(null);
        }, 400);
    };

    const goBack = () => {
        if (isTransferScan && pageIndex === 0) {
            setPage('transferSend');
        } else if (page === 'transferSend' && qrPrefilledTransfer) {
            setQrPrefilledTransfer(false);
            setPage('scan');
        } else if (pageIndex > 0) {
            setPage(PAGES[pageIndex - 1]);
        }
    };

    const showBackButton = pageIndex > 0 || (isTransferScan && pageIndex === 0);

    return (
        <BottomSheet
            open={open}
            onClose={handleClose}
            showDragHandle={true}
            enableDrag={true}
            className=" overflow-hidden"
        >
            {/* Back button */}
            <div
                className="px-4 hidden z-50 absolute pt-1 pb-0"
                style={{
                    opacity: showBackButton ? 1 : 0,
                    pointerEvents: showBackButton ? 'auto' : 'none',
                    transition: 'opacity 0.22s ease',
                }}
            >
                <button
                    onClick={goBack}
                    aria-label={t.common.accessibility.goBack}
                    className="flex cursor-pointer items-center gap-1.5 text-[#444444] active:opacity-60 transition-opacity"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <span className="text-[13px] font-medium">{t.common.accessibility.back}</span>
                </button>
            </div>
            {/* Sliding track */}
            <div className="overflow-hidden h-full w-full">
                <div
                    className="flex h-full w-full"
                    style={{
                        // translateX is physical, the flex row is not: under dir="rtl"
                        // main-start is the right edge, so page n already sits at
                        // -n*100% and the transform has to push it back the other way.
                        transform: `translateX(${(rtl ? 1 : -1) * pageIndex * 100}%)`,
                        transition: SLIDE_TRANSITION,
                    }}
                >
                    {/* Page 0 — QR Scanner */}
                    <div className="w-full shrink-0 h-full">
                        <QrScannerContent
                            onScan={onScan}
                            onClose={handleClose}
                            onSend={() => navigate('sendChoose')}
                        />
                    </div>

                    {/* Page 1 — Send / Pay / Choose */}
                    <div className="w-full shrink-0 h-full">
                        <SendChoose onNavigate={navigate} />
                    </div>

                    {/* Page 2 — Transfer | Send */}
                    <div className="w-full shrink-0 h-full">
                        <TransferSend
                            onClose={handleClose}
                            prefillAccountNumber={
                                qrPrefilledTransfer && parsedQR ? parsedQR.accountNumber : undefined
                            }
                            prefillCurrencySymbol={
                                qrPrefilledTransfer && parsedQR?.currency
                                    ? parsedQR.currency.toUpperCase()
                                    : undefined
                            }
                        />
                    </div>

                    {/* Page 3 — Payment Request Review (payer mode via QR scan) */}
                    <div className="w-full shrink-0 h-full">
                        {parsedQR && (
                            <PaymentRequestReview
                                parsedQR={parsedQR}
                                onMerchant={(merchant) => {
                                    setHandedOffMerchant(merchant);
                                    setPage('merchantPayment');
                                }}
                                onDone={handleClose}
                                onBack={() => setPage('scan')}
                            />
                        )}
                    </div>

                    {/* Page 4 — Payment Request View (requester mode via pending transaction) */}
                    <div className="w-full shrink-0 h-full">
                        {paymentRequestCode && (
                            <PaymentRequestReview
                                requestCode={paymentRequestCode}
                                onDone={handleClose}
                                onBack={handleClose}
                            />
                        )}
                    </div>

                    {/* Page 5 — Merchant order (scanned shop QR, or an mrcpay deep link) */}
                    <div className="w-full shrink-0 h-full">
                        {(merchantCode || parsedQR?.merchantCode || handedOffMerchant) && (
                            <MerchantPaymentReview
                                code={merchantCode || parsedQR?.merchantCode || undefined}
                                merchant={handedOffMerchant ?? undefined}
                                onDone={handleClose}
                                onBack={merchantCode ? handleClose : () => setPage('scan')}
                            />
                        )}
                    </div>
                </div>
            </div>
        </BottomSheet>
    );
};

export default QrScanner;
