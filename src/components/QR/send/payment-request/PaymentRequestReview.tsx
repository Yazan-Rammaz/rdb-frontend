'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/I18nContext';
import { usePaymentRequestAPI } from '@/hooks/usePaymentRequestAPI';
import { usePaymentRequestEncryption } from '@/hooks/usePaymentRequestEncryption';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Input from '@/components/ui/Input';
import DetailRow from '../../shared/DetailRow';
import CountdownTimer from './CountdownTimer';
import SendButton from './SendButton';
import SuccessReceipt from '../shared/SuccessReceipt';
import type { ReceiptData } from '../shared/SuccessReceipt';
import { CustomQRCode } from '@/components/ui/CustomQR';
import { shareQRImage } from '../../shared/shareQRImage';
import { ActionButton } from '../../shared/ActionButton';
import TitleIcon from '@/assets/icons/home/qr/sendT.svg';
import LogoIcon from '@/assets/icons/home/qr/title.svg';
import QrInputMethodIcon from '@/assets/icons/home/transfer/qrinputmethod.svg';
import CopySvg from '@/assets/icons/home/qr/copy.svg';
import DownloadSvg from '@/assets/icons/home/qr/download.svg';
import ShareSvg from '@/assets/icons/home/qr/share.svg';
import CancelSvg from '@/assets/icons/home/qr/cancel.svg';
import type { ParsedQR } from '../types';
import type { PaymentRequestLookup, PaymentRequestStatus } from '@/core/types';
import SenderCard from '../transfer/SenderCard';
import TransferSuccess from '../transfer/TransferSuccess';

/**
 * Two entry modes:
 * 1. Payer (QR scan): parsedQR with encryptedRequestCode — decrypt → lookup → show Send + Cancel
 * 2. Requester (pending tx): requestCode directly — lookup → show QR/receipt based on status
 */
interface PaymentRequestReviewProps {
    parsedQR?: ParsedQR;
    requestCode?: string;
    onDone: () => void;
    onBack: () => void;
}

const BLOCKED_STATUSES: PaymentRequestStatus[] = ['EXPIRED', 'FULFILLED', 'CANCELLED'];

const PaymentRequestReview: React.FC<PaymentRequestReviewProps> = ({
    parsedQR,
    requestCode: directRequestCode,
    onDone,
    onBack,
}) => {
    const { activeAssetSymbol, balances, account, refreshTransactions } = useStore();
    const { toast } = useToast();
    const { t } = useTranslation();

    // Determine mode
    const isRequesterMode = !!directRequestCode;
    const requesterAccount = parsedQR?.requesterAccount || '';
    const encryptedRequestCode = parsedQR?.encryptedRequestCode || '';

    // In requester mode, use the user's own account number for re-encrypting
    const cryptoAccount = isRequesterMode ? account?.number || '' : requesterAccount;

    const api = usePaymentRequestAPI();
    const { encrypt, decrypt } = usePaymentRequestEncryption(cryptoAccount);

    // Refs for stable closure
    const apiRef = useRef(api);
    apiRef.current = api;
    const encryptRef = useRef(encrypt);
    encryptRef.current = encrypt;
    const decryptRef = useRef(decrypt);
    decryptRef.current = decrypt;
    const toastRef = useRef(toast);
    toastRef.current = toast;
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;

    // Data state
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [data, setData] = useState<PaymentRequestLookup | null>(null);
    const [requestId, setRequestId] = useState<string>('');
    const [qrValue, setQrValue] = useState<string | null>(null);
    const captureRef = useRef<HTMLDivElement>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Action state
    const [isExpired, setIsExpired] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    // Payer mode inline cancel
    const [showCancelInput, setShowCancelInput] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const senderBalance = activeAssetSymbol ? balances[activeAssetSymbol] : undefined;
    const senderAccountNumber = senderBalance?.accountNumber || account?.number || '';

    // Change bottom sheet bg for cancelled/expired in requester mode
    useEffect(() => {
        if (!isRequesterMode || !data) return;
        const isCancelledOrExpired =
            data.status === 'CANCELLED' || data.status === 'EXPIRED' || isExpired;
        if (!isCancelledOrExpired) return;

        const bottomSheet = document.getElementById('bottom-sheet');
        if (!bottomSheet) return;

        const previousBg = bottomSheet.style.backgroundColor;
        bottomSheet.style.backgroundColor = '#FFF5F5';

        return () => {
            bottomSheet.style.backgroundColor = previousBg;
        };
    }, [isRequesterMode, data, isExpired]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);

        try {
            let code: string;

            if (directRequestCode) {
                code = directRequestCode;
            } else if (encryptedRequestCode && requesterAccount) {
                try {
                    code = await decryptRef.current(encryptedRequestCode);
                } catch {
                    toastRef.current.error('Could not read QR code. Please try again.');
                    onBackRef.current();
                    return;
                }
            } else {
                setFetchError('Invalid payment request data');
                setLoading(false);
                return;
            }

            const result = await apiRef.current.lookupPaymentRequest(code);

            if ('error' in result) {
                setFetchError(result.error);
                toastRef.current.error(result.error);
                setLoading(false);
                return;
            }

            setData(result);
            setRequestId(result.id);

            if (!result.isPermanent) {
                const expiryTime = new Date(result.expiresAt).getTime();
                if (Date.now() >= expiryTime) {
                    setIsExpired(true);
                }
            }

            // In requester mode, re-encrypt to show QR (for ACTIVE and also for display in cancelled/expired with opacity)
            if (directRequestCode && result.requestCode) {
                try {
                    const qrString = await encryptRef.current(result.requestCode);
                    setQrValue(qrString);
                } catch {
                    // Non-critical
                }
            }

            setLoading(false);
        } catch {
            setFetchError('Failed to load payment request');
            toastRef.current.error('Failed to load payment request');
            setLoading(false);
        }
    }, [encryptedRequestCode, requesterAccount, directRequestCode]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleExpired = useCallback(async () => {
        try {
            let code: string | null = null;
            if (directRequestCode) {
                code = directRequestCode;
            } else if (encryptedRequestCode && requesterAccount) {
                code = await decryptRef.current(encryptedRequestCode);
            }
            if (code) {
                const result = await apiRef.current.lookupPaymentRequest(code);
                if (!('error' in result)) {
                    setData(result);
                }
            }
        } catch {
            // still mark expired locally if API fails
        }
        setIsExpired(true);
    }, [directRequestCode, encryptedRequestCode, requesterAccount]);

    const handleSend = async () => {
        if (!data || !requestId || isSending) return;

        if (!data.isPermanent) {
            const expiryTime = new Date(data.expiresAt).getTime();
            if (Date.now() >= expiryTime) {
                setIsExpired(true);
                return;
            }
        }

        setIsSending(true);
        setSendError(null);

        const idempotencyKey = `fulfill-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const result = await apiRef.current.fulfillPaymentRequest({
            id: requestId,
            accountNumber: senderAccountNumber,
            idempotencyKey,
        });

        if ('error' in result) {
            setSendError(result.error);
            toastRef.current.error(result.error);
            setIsSending(false);
            return;
        }

        refreshTransactions();

        setReceiptData({
            referenceCode: data.requestCode || requestId,
            createdAt: new Date().toISOString(),
            status: 'COMPLETED',
            senderAccountNumber,
            senderMaskedName: account?.name || '',
            recipientAccountNumber: data.requesterAccountNumber,
            recipientMaskedName: data.requesterAccountName,
            amount: String(data.amount),
            currency: data.assetSymbol,
            purposeLabel: data.purpose?.name || '',
            inputMethod: isRequesterMode ? 'MANUAL' : 'QR',
        });
        setIsSending(false);
    };

    // Cancel via confirm dialog (requester mode)
    const handleCancelConfirm = async (reason?: string) => {
        if (!requestId || isCancelling) return;

        const finalReason = reason?.trim() || 'no reason';
        setIsCancelling(true);
        setShowCancelDialog(false);

        const result = await apiRef.current.cancelPaymentRequest({
            id: requestId,
            reason: finalReason,
        });

        if ('error' in result) {
            toastRef.current.error(result.error);
            setIsCancelling(false);
            return;
        }

        setData((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
        setIsCancelling(false);
        toastRef.current.success('Payment request cancelled');
        refreshTransactions();
    };

    // Cancel via inline input (payer mode)
    const handleCancelInline = async () => {
        if (!requestId || isCancelling || !cancelReason.trim()) return;

        setIsCancelling(true);
        const result = await apiRef.current.cancelPaymentRequest({
            id: requestId,
            reason: cancelReason.trim(),
        });

        if ('error' in result) {
            toastRef.current.error(result.error);
            setIsCancelling(false);
            return;
        }

        setData((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
        setShowCancelInput(false);
        setCancelReason('');
        setIsCancelling(false);
        toastRef.current.success('Payment request cancelled');
        refreshTransactions();
    };

    // --- Requester action handlers (copy/download/share) ---
    const captureCanvas = (): Promise<HTMLCanvasElement | null> => {
        return new Promise((resolve) => {
            setShowPreview(true);
            requestAnimationFrame(async () => {
                if (!captureRef.current) {
                    setShowPreview(false);
                    resolve(null);
                    return;
                }
                try {
                    const html2canvas = (await import('html2canvas')).default;
                    const canvas = await html2canvas(captureRef.current, {
                        backgroundColor: '#FFFFFF',
                        scale: 2,
                    });
                    resolve(canvas);
                } catch {
                    resolve(null);
                } finally {
                    setShowPreview(false);
                }
            });
        });
    };

    const handleCopy = async () => {
        if (!qrValue) return;
        try {
            await navigator.clipboard.writeText(qrValue);
            toastRef.current.success(t.home.qr.messages.qrCopied);
        } catch {
            toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
        }
    };

    const handleDownload = async () => {
        const canvas = await captureCanvas();
        if (!canvas) {
            toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
            return;
        }
        const link = document.createElement('a');
        link.download = `payment-request-${data?.requestCode || requestId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toastRef.current.success(t.home.qr.messages.qrDownloadSuccess);
    };

    const handleShareQR = async () => {
        const canvas = await captureCanvas();
        if (!canvas) {
            toastRef.current.error(t.home.qr.messages.qrDownloadFailed);
            return;
        }
        const result = await shareQRImage(
            canvas,
            `Payment Request — ${data?.requesterAccountNumber || ''}`,
            `Amount: ${data?.amount} ${data?.assetSymbol}`,
        );
        if (result === 'shared') {
            toastRef.current.success(t.home.qr.messages.qrShareSuccess);
        } else if (result === 'copied') {
            toastRef.current.success(t.home.qr.messages.qrCopied);
        }
    };

    const isBlocked = isExpired || (data ? BLOCKED_STATUSES.includes(data.status) : false);
    const canSend = !isBlocked && !isSending && !!requestId;

    // Requester: is the request in a dead state (cancelled or expired)?
    const isRequesterDead =
        isRequesterMode && (data?.status === 'EXPIRED' || data?.status === 'CANCELLED');

    // --- Loading ---
    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#388CFF] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] text-[#8D8D8D]">{t.transfer.deposit.title}…</p>
                </div>
            </div>
        );
    }

    // --- Fetch error ---
    if (fetchError || !data) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <p className="text-[13px] text-[#FF4D4D]">
                        {fetchError || 'Failed to load request'}
                    </p>
                    <button
                        onClick={() => void fetchData()}
                        className="text-[13px] text-[#388CFF] font-medium underline"
                    >
                        Retry
                    </button>
                    <button onClick={onBack} className="text-[13px] text-[#8D8D8D] mt-1">
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    // --- Success receipt (after fulfill in payer mode) ---
    if (receiptData) {
        return <SuccessReceipt data={receiptData} onClose={onDone} />;
    }

    // --- Requester FULFILLED view (receipt) ---
    if (isRequesterMode && data.status === 'FULFILLED') {
        const fulfilledReceipt: ReceiptData = {
            referenceCode: data.requestCode || requestId,
            createdAt: data.createdAt || new Date().toISOString(),
            status: 'COMPLETED',
            senderAccountNumber: '',
            senderMaskedName: '',
            recipientAccountNumber: data.requesterAccountNumber,
            recipientMaskedName: data.requesterAccountName,
            amount: String(data.amount),
            currency: data.assetSymbol,
            purposeLabel: data.purpose?.name || '',
            inputMethod: 'MANUAL',
        };
        return (
            <div className="w-full h-full flex items-center justify-center overflow-y-auto">
                <div className="max-w-xd-370 mx-xd-30 h-full"></div>
            </div>
        );
    }

    // --- Requester mode view (ACTIVE / CANCELLED / EXPIRED) ---
    if (isRequesterMode) {
        const isActive = data.status === 'ACTIVE' && !isExpired;

        return (
            <div className="flex flex-col items-center w-full h-full relative overflow-hidden">
                <div
                    className={`flex-1 w-full flex flex-col ${isRequesterMode ? ' pb-0' : ' pb-24'} pt-2 overflow-y-auto`}
                >
                    {/* Logo header */}
                    <div className="flex flex-col items-center w-full">
                        <div className="relative w-25 h-7">
                            <Image
                                src={LogoIcon}
                                alt="Title Icon"
                                fill
                                className="object-contain"
                            />
                        </div>

                        {/* QR Code — faded when cancelled/expired */}
                        <div className="w-62.5 mt-3 shrink-0 h-62.5 flex flex-col items-center justify-center gap-2">
                            <div ref={captureRef} className={isRequesterDead ? 'opacity-10' : ''}>
                                <CustomQRCode
                                    errorCorrectionLevel="L"
                                    value={qrValue || ''}
                                    size={224}
                                />
                            </div>
                            <p className="text-4 font-light text-text text-center pt-1">
                                {isRequesterDead
                                    ? 'Expired Code ( Time Expired )'
                                    : data.requesterAccountNumber}
                            </p>
                        </div>
                    </div>

                    {/* Request details — matching CreatePaymentRequest review layout */}
                    <div className="px-xd-25 mt-2 space-y-0 bg-transparent">
                        {/* Account Name */}
                        <Input
                            containerClassName="bg-transparent w-full"
                            hideRequired
                            reviewMode
                            disabled
                            readOnly
                            label={t.home.deposit.accountName}
                            value={data.requesterAccountName}
                        />

                        {/* Account Number + Currency */}
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            readOnly
                            containerClassName="bg-transparent w-full"
                            label={t.home.deposit.accountNumber}
                            value={`${data.requesterAccountNumber}  ${data.assetSymbol}`}
                        />

                        {/* Amount + Reference row */}
                        <div className="flex gap-2 w-full">
                            <Input
                                hideRequired
                                reviewMode
                                disabled
                                label={t.home.qr.enterAmount}
                                value={String(data.amount)}
                                suffix={data.assetSymbol}
                                containerClassName="bg-transparent w-1/2"
                            />
                            {data.reference && (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label={t.home.qr.enterReference}
                                    value={data.reference}
                                    containerClassName="bg-transparent w-1/2"
                                />
                            )}
                        </div>

                        {/* Purpose + Type row */}
                        <div className="flex gap-2 w-full">
                            {data.purpose?.name && (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label={t.home.qr.selectPurpose}
                                    value={data.purpose.name}
                                    className="text-[11px]!"
                                    containerClassName="bg-transparent w-1/2"
                                />
                            )}
                            <Input
                                hideRequired
                                reviewMode
                                disabled
                                label={t.home.qr.type}
                                value={t.home.qr.paymentRequest}
                                className="text-[11px]!"
                                containerClassName="bg-transparent w-1/2"
                            />
                        </div>

                        {/* Note */}

                        <div className="flex gap-2 w-full">
                            {data.note && (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label="Note"
                                    value={data.note}
                                    className="text-[11px]!"
                                    containerClassName="bg-transparent "
                                />
                            )}
                        </div>
                        {/* Valid Until */}

                        <div className="flex gap-2 w-full px-2">
                            {data.isPermanent ? (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label={t.home.qr.validUntil}
                                    value={t.home.qr.validity.always}
                                    className="text-[11px]!"
                                    containerClassName="bg-transparent w-1/2"
                                />
                            ) : data.expiresAt ? (
                                <CountdownTimer
                                    expiryTimestamp={data.expiresAt}
                                    onExpired={handleExpired}
                                />
                            ) : null}
                        </div>
                        {/* Expired / Cancelled badge */}
                        {isRequesterDead && (
                            <div className="flex w-full flex-col items-center py-4">
                                <button
                                    disabled
                                    className="text-center flex items-center justify-center h-7.5 w-full py-3 rounded-xl text-[#FFFFFF] bg-[#FF5F60] text-[11px] font-medium cursor-not-allowed"
                                >
                                    {data.status === 'CANCELLED'
                                        ? t.transfer.deposit.cancelled
                                        : t.transfer.deposit.expiredButton}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom action bar — only when ACTIVE */}
                {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]">
                        <div className="flex items-center justify-center gap-13 px-6 py-4">
                            <ActionButton
                                icon={CopySvg}
                                label={t.home.qr.copy}
                                onClick={() => void handleCopy()}
                            />
                            <ActionButton
                                icon={DownloadSvg}
                                label={t.home.qr.download}
                                onClick={() => void handleDownload()}
                            />
                            <ActionButton
                                icon={ShareSvg}
                                label={t.home.qr.share}
                                onClick={() => void handleShareQR()}
                            />
                            <ActionButton
                                icon={CancelSvg}
                                label={t.home.qr.cancel}
                                onClick={() => setShowCancelDialog(true)}
                            />
                        </div>
                    </div>
                )}

                {/* Cancel confirmation dialog */}
                <ConfirmDialog
                    open={showCancelDialog}
                    onCancel={() => setShowCancelDialog(false)}
                    onConfirm={(reason) => void handleCancelConfirm(reason)}
                    title={t.home.qr.cancel}
                    message="Are you sure you want to cancel this payment request?"
                    confirmLabel={t.common.cancel}
                    cancelLabel="Keep"
                    inputConfig={{
                        placeholder: 'Reason for cancellation',
                        defaultValue: 'no reason',
                    }}
                />
            </div>
        );
    }

    // --- Payer mode (default) ---
    return (
        <div className="w-full h-full overflow-y-auto relative flex flex-col">
            <div className="w-full relative flex flex-col flex-1">
                {/* Header */}
                <div className="flex flex-col items-center mb-4 pt-2">
                    <div className="mb-3">
                        <Image src={TitleIcon} alt="Transfer" width={40} height={40} />
                    </div>
                    <h2 className="text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase">
                        {t.transfer.deposit.title}
                    </h2>
                </div>

                <SenderCard selectedAssetSymbol={data.assetSymbol} />

                {/* Send To divider */}
                <p className="text-[13px] text-[#1D1D1D] font-medium text-center mt-4 mb-2">
                    {t.transfer.sendTo}
                </p>

                {/* Payment request details */}
                <div className="flex items-center justify-center w-full">
                    <div className="overflow-auto pb-40 w-xd-370 space-y-1">
                        <DetailRow
                            bg="#F7F7F7"
                            label={t.transfer.recipient.recipientAccountNumber}
                            value={`${data.requesterAccountNumber}  ${data.requesterAccountName}`}
                            icon={
                                <Image
                                    src={QrInputMethodIcon}
                                    alt="QR"
                                    width={14}
                                    height={14}
                                    className="object-contain"
                                />
                            }
                        />

                        <DetailRow
                            bg="#F7F7F7"
                            label={t.transfer.deposit.amountToBeSent}
                            value={`${data.amount} ${data.assetSymbol}`}
                            bold
                        />

                        {data.purpose?.name && (
                            <DetailRow
                                bg="#F7F7F7"
                                label={t.transfer.deposit.purposeOfRequest}
                                value={data.purpose.name}
                            />
                        )}

                        {data.reference && (
                            <DetailRow
                                bg="#F7F7F7"
                                label={t.transfer.deposit.referenceId}
                                value={data.reference}
                            />
                        )}

                        {data.note && <DetailRow bg="#F7F7F7" label="Note" value={data.note} />}

                        {!data.isPermanent && data.expiresAt && (
                            <CountdownTimer
                                expiryTimestamp={data.expiresAt}
                                onExpired={handleExpired}
                            />
                        )}

                        {sendError && (
                            <div className="bg-[#FFF0F0] border border-[#FF4D4D]/20 rounded-lg p-3 mt-2">
                                <p className="text-[12px] text-[#FF4D4D]">{sendError}</p>
                            </div>
                        )}

                        {showCancelInput && (
                            <div className="mt-3 flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Reason for cancellation"
                                    className="w-full text-[13px] text-[#1D1D1D] bg-transparent border-b border-[#E0E0E0] focus:border-[#388CFF] focus:outline-0 pb-1 transition-colors"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => void handleCancelInline()}
                                        disabled={!cancelReason.trim() || isCancelling}
                                        className="flex-1 py-2 rounded-lg bg-[#FF4D4D]/10 text-[#FF4D4D] text-[12px] font-medium disabled:opacity-50"
                                    >
                                        {isCancelling ? 'Cancelling…' : 'Confirm Cancel'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCancelInput(false);
                                            setCancelReason('');
                                        }}
                                        className="flex-1 py-2 rounded-lg bg-[#F5F5F5] text-[#8D8D8D] text-[12px] font-medium"
                                    >
                                        Keep
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1" />

                {/* Action buttons */}
                <div className="absolute bottom-0 w-full bg-white">
                    <div className="flex flex-col gap-2 px-4">
                        <SendButton
                            isExpired={isExpired || data.status === 'EXPIRED'}
                            isSending={isSending}
                            isDisabled={!canSend}
                            onSend={() => void handleSend()}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentRequestReview;
