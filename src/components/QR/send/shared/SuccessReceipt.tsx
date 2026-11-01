'use client';

import React, { useRef, useState } from 'react';
import { Clock, TimerOff, XCircle, type LucideIcon } from 'lucide-react';
import { useInlineFeedback } from '@/hooks/useInlineFeedback';
import InlineFeedback from '@/components/ui/InlineFeedback';
import TransferDoneIcon from '@/assets/icons/home/transfer/transferdone.svg';
import SuccessIcon from '@/assets/icons/home/transfer/success.svg';
import ShareIcon from '@/assets/icons/home/qr/share.svg';
import DownloadIcon from '@/assets/icons/home/qr/download.svg';
import DoneIcon from '@/assets/icons/home/transfer/done.svg';
import QrInputMethodIcon from '@/assets/icons/home/transfer/qrinputmethod.svg';
import TrydosIcon from '@/assets/icons/trydos.svg';
import { shareQRImage } from '../../shared/shareQRImage';
import { formatDateTime } from '../../shared/formatDateTime';
import DetailRow from '../../shared/DetailRow';
import DownloadView from './DownloadView';
import { ActionButton } from '../../shared/ActionButton';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import type { ReceiptData } from './receipt-types';
import { QRCodeDisplay } from './QRCodeDisplay';
import { getReceiptTone, RECEIPT_TONES, type ReceiptTone } from './receiptStatus';

export type { ReceiptData };
export { QRCodeDisplay };

/** Non-success tones draw a lucide icon in the tone's accent; success keeps its SVGs. */
const TONE_ICONS: Record<Exclude<ReceiptTone, 'success'>, LucideIcon> = {
    pending: Clock,
    expired: TimerOff,
    failed: XCircle,
};

interface SuccessReceiptProps {
    data: ReceiptData;
    onClose: () => void;
}

const SuccessReceipt: React.FC<SuccessReceiptProps> = ({ data, onClose }) => {
    // Download / share results, in the action bar's empty top padding.
    const { feedback, success: showSuccess, error: showError } = useInlineFeedback();
    const { t, language, tr } = useTranslation();
    const downloadRef = useRef<HTMLDivElement>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [screenSize, setScreenSize] = useState({ w: 430, h: 932 });
    const html2canvasRef = useRef<(typeof import('html2canvas'))['default'] | null>(null);

    React.useEffect(() => {
        setScreenSize({ w: window.innerWidth, h: window.innerHeight });
        // Pre-load html2canvas so capture is instant
        import('html2canvas').then((m) => {
            html2canvasRef.current = m.default;
        });
    }, []);

    const dateTime = formatDateTime(data.createdAt, language);
    const tone = getReceiptTone(data.status);
    const { bg, accent } = RECEIPT_TONES[tone];
    const isIncoming = data.direction === 'IN';
    const receiptT = t.transfer.receipt;

    const getStatusText = (status: string) => {
        const key = status.toLowerCase() as keyof typeof receiptT.statusValue;
        return receiptT.statusValue[key] || status;
    };

    const displayStatus = getStatusText(data.status);

    const headline =
        tone === 'success'
            ? isIncoming
                ? receiptT.headline.received
                : receiptT.moneySentSuccess
            : receiptT.headline[tone];

    const ToneIcon = tone === 'success' ? null : TONE_ICONS[tone];

    React.useEffect(() => {
        const bottomSheet = document.getElementById('bottom-sheet');
        if (!bottomSheet) return;

        const previousBackgroundColor = bottomSheet.style.backgroundColor;
        bottomSheet.style.backgroundColor = bg;

        return () => {
            bottomSheet.style.backgroundColor = previousBackgroundColor;
        };
    }, [bg]);

    const captureCanvas = async (): Promise<HTMLCanvasElement> => {
        const el = downloadRef.current;
        if (!el) throw new Error('DownloadView ref not available');
        const html2canvas = html2canvasRef.current || (await import('html2canvas')).default;
        return html2canvas(el, {
            backgroundColor: '#FFFFFF',
            scale: window.devicePixelRatio || 1,
            width: el.offsetWidth,
            height: el.offsetHeight,
        });
    };

    const handleDownload = async () => {
        try {
            const canvas = await captureCanvas();
            const link = document.createElement('a');
            link.download = `transfer-receipt-${data.referenceCode}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showSuccess(receiptT.downloaded);
        } catch {
            showError(receiptT.downloadFailed);
        }
    };

    const handleShare = async () => {
        try {
            const canvas = await captureCanvas();
            const result = await shareQRImage(
                canvas,
                tr('transfer.receipt.shareTitle', { code: data.referenceCode }),
                tr('transfer.receipt.shareText', {
                    amount: data.amount,
                    currency: data.currency,
                    sender: data.senderFirstName || data.senderAccountNumber,
                }),
            );
            if (result === 'shared') {
                showSuccess(receiptT.shared);
            } else if (result === 'copied') {
                showSuccess(receiptT.sharedCopied);
            }
        } catch {
            showError(receiptT.shareFailed);
        }
    };

    return (
        <div className="flex flex-col relative h-full w-full" style={{ backgroundColor: bg }}>
            {/* Content scrolls; the action bar below keeps its own space.
                `my-auto` on the child (not justify-center on the scroller)
                centres it when it fits and never clips its top when it doesn't. */}
            <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col">
                <div className="my-auto w-full px-xd-16 flex flex-col items-center">
                    {/* Status icon */}
                    <div className="mt-xd-16 mb-xd-12">
                        {ToneIcon ? (
                            <span
                                className="flex items-center justify-center size-xd-40 rounded-full"
                                style={{ backgroundColor: `${accent}1F` }}
                            >
                                <ToneIcon
                                    aria-hidden
                                    className="size-xd-22"
                                    color={accent}
                                    strokeWidth={2}
                                />
                            </span>
                        ) : (
                            <Image
                                src={TransferDoneIcon}
                                alt="Transfer Done"
                                className="size-xd-40"
                            />
                        )}
                    </div>

                    {/* Status message */}
                    <h2
                        className="text-xd-13 font-medium text-center mb-xd-16 uppercase"
                        style={{ color: tone === 'success' ? '#1D1D1D' : accent }}
                    >
                        {headline}
                    </h2>

                    {/* QR Code */}
                    <div className="mb-xd-8">
                        <QRCodeDisplay value={data.referenceCode} bg={bg} size={120} />
                    </div>

                    {/* Verification code */}
                    <p className="text-xd-13 text-[#1D1D1D] font-medium mb-xd-24 break-all text-center">
                        {data.referenceCode}
                    </p>

                    {/* Transaction details */}
                    <div className="w-xd-370 max-w-full space-y-xd-16">
                        {/* Sender */}
                        <DetailRow
                            label={receiptT.senderAccountNumber}
                            value={`${data.senderAccountNumber}  ${data.senderMaskedName}`}
                        />

                        {/* Recipient */}
                        <div>
                            <div className="flex items-center gap-xd-4">
                                <p className="text-xd-11 text-[#8D8D8D] font-medium">
                                    {receiptT.recipientAccountNumber}
                                </p>
                                {data.inputMethod === 'QR' && (
                                    <Image
                                        src={QrInputMethodIcon}
                                        alt="QR Input"
                                        width={14}
                                        height={14}
                                        className="size-xd-14 object-contain"
                                    />
                                )}
                            </div>
                            <p className="text-xd-13 text-[#1D1D1D] mt-xd-5 font-medium">
                                {data.recipientAccountNumber} {data.recipientMaskedName}
                            </p>
                        </div>

                        {/* Receipt grid: 2 cols, rows share same height */}
                        <div className="grid grid-cols-2 gap-y-xd-16 gap-x-xd-48">
                            <DetailRow
                                label={isIncoming ? receiptT.amountReceived : receiptT.amountSent}
                                value={`${data.amount} ${data.currency}`}
                                bold
                            />
                            <DetailRow label={receiptT.reference} value={data.referenceCode} />
                            <DetailRow label={receiptT.dateTime} value={dateTime} />
                            <DetailRow
                                label={receiptT.type}
                                value={data.typeLabel ?? receiptT.typeValue}
                            />
                            <DetailRow label={receiptT.purpose} value={data.purposeLabel || '—'} />
                            <div>
                                <p className="text-xd-11 text-[#8D8D8D] font-medium">
                                    {receiptT.status}
                                </p>
                                <div className="flex items-center gap-xd-4">
                                    <span
                                        className="text-xd-13 mt-xd-5 font-medium"
                                        style={{ color: tone === 'success' ? '#1D1D1D' : accent }}
                                    >
                                        {displayStatus}
                                    </span>
                                    {ToneIcon ? (
                                        <ToneIcon
                                            aria-hidden
                                            className="size-xd-16 mt-xd-5"
                                            color={accent}
                                            strokeWidth={2}
                                        />
                                    ) : (
                                        <Image
                                            src={SuccessIcon}
                                            alt="Success"
                                            width={16}
                                            height={16}
                                            className="size-xd-16"
                                        />
                                    )}
                                </div>
                            </div>
                            {data.extraRows?.map((row) => (
                                <DetailRow key={row.label} label={row.label} value={row.value} />
                            ))}
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="mt-xd-24 mb-xd-16">
                        <p className="text-xd-18 w-xd-80 font-bold text-[#1D1D1D] tracking-wider">
                            <Image
                                alt="trydos"
                                width={80}
                                height={25}
                                src={TrydosIcon}
                                className="w-xd-80 h-xd-25"
                            />
                        </p>
                    </div>
                </div>
            </div>

            {/* Action buttons — in the layout flow, so they never cover the content */}
            <div
                className="relative shrink-0 flex max-w-xd-370 mx-auto items-center justify-around w-full pt-xd-16 pb-xd-16 border-t border-gray-100"
                style={{ backgroundColor: bg }}
            >
                {/* The bar's empty pt-xd-16: out of flow, nothing moves. */}
                <InlineFeedback
                    feedback={feedback}
                    lines={1}
                    className="absolute inset-x-0 top-0 h-xd-16 items-center"
                />
                <ActionButton
                    icon={DoneIcon}
                    label={receiptT.done}
                    onClick={onClose}
                    bounceOnClick
                />
                <ActionButton
                    icon={DownloadIcon}
                    label={receiptT.download}
                    onClick={handleDownload}
                    bounceOnClick
                />
                <ActionButton
                    icon={ShareIcon}
                    label={receiptT.share}
                    onClick={handleShare}
                    bounceOnClick
                    animationType="share"
                />
            </div>

            {/* Off-screen download view */}
            <DownloadView
                ref={downloadRef}
                show={showPreview}
                data={data}
                screenWidth={screenSize.w}
            />
        </div>
    );
};

export default SuccessReceipt;
