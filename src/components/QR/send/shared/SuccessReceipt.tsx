'use client';

import React, { useRef, useState } from 'react';
import { useToast } from '@/context/ToastContext';
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

export type { ReceiptData };
export { QRCodeDisplay };

interface SuccessReceiptProps {
    data: ReceiptData;
    onClose: () => void;
}

const SuccessReceipt: React.FC<SuccessReceiptProps> = ({ data, onClose }) => {
    const { toast } = useToast();
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

    const getStatusText = (status: string) => {
        const key = status.toLowerCase() as keyof typeof t.transfer.receipt.statusValue;
        return t.transfer.receipt.statusValue[key] || status;
    };

    const displayStatus = getStatusText(data.status);

    React.useEffect(() => {
        const bottomSheet = document.getElementById('bottom-sheet');
        if (!bottomSheet) return;

        const previousBackgroundColor = bottomSheet.style.backgroundColor;
        bottomSheet.style.backgroundColor = '#F4FFFA';

        return () => {
            bottomSheet.style.backgroundColor = previousBackgroundColor;
        };
    }, []);

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
            toast.success(t.transfer.receipt.downloaded);
        } catch {
            toast.error(t.transfer.receipt.downloadFailed);
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
                toast.success(t.transfer.receipt.shared);
            } else if (result === 'copied') {
                toast.success(t.transfer.receipt.sharedCopied);
            }
        } catch {
            toast.error(t.transfer.receipt.shareFailed);
        }
    };

    return (
        <div className="flex flex-col relative bg-[#F4FFFA] h-full items-center w-full overflow-y-auto">
            {/* Success icon */}
            <div className="mt-xd-16 mb-xd-12">
                <Image src={TransferDoneIcon} alt="Transfer Done" className="size-xd-40" />
            </div>

            {/* Success message */}
            <h2 className="text-xd-13 text-[#1D1D1D] font-medium text-center mb-xd-16 uppercase">
                {t.transfer.receipt.moneySentSuccess}
            </h2>

            {/* QR Code */}
            <div className="mb-xd-8">
                <QRCodeDisplay value={data.referenceCode} bg={'#F4FFFA'} size={120} />
            </div>

            {/* Verification code */}
            <p className="text-xd-13 text-[#1D1D1D] font-medium mb-xd-24">{data.referenceCode}</p>

            {/* Transaction details */}
            <div className="w-full space-y-xd-16">
                {/* Sender */}
                <DetailRow
                    label={t.transfer.receipt.senderAccountNumber}
                    value={`${data.senderAccountNumber}  ${data.senderMaskedName}`}
                />

                {/* Recipient */}
                <div>
                    <div className="flex items-center gap-xd-4">
                        <p className="text-xd-11 text-[#8D8D8D] font-medium">
                            {t.transfer.receipt.recipientAccountNumber}
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
                        label={t.transfer.receipt.amountSent}
                        value={`${data.amount} ${data.currency}`}
                        bold
                    />
                    <DetailRow label={t.transfer.receipt.reference} value={data.referenceCode} />
                    <DetailRow label={t.transfer.receipt.dateTime} value={dateTime} />
                    <DetailRow
                        label={t.transfer.receipt.type}
                        value={t.transfer.receipt.typeValue}
                    />
                    <DetailRow label={t.transfer.receipt.purpose} value={data.purposeLabel} />
                    <div>
                        <p className="text-xd-11 text-[#8D8D8D] font-medium">
                            {t.transfer.receipt.status}
                        </p>
                        <div className="flex items-center gap-xd-4">
                            <span className="text-xd-13 text-[#1D1D1D] mt-xd-5 font-medium">
                                {displayStatus}
                            </span>
                            <Image
                                src={SuccessIcon}
                                alt="Success"
                                width={16}
                                height={16}
                                className="size-xd-16"
                            />
                        </div>
                    </div>
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

            {/* Action buttons */}
            <div className="flex bg-[#F4FFFA] absolute bottom-0 max-w-xd-370 items-center justify-around w-full m-xd-16 pt-xd-16 border-t border-gray-100">
                <ActionButton
                    icon={DoneIcon}
                    label={t.transfer.receipt.done}
                    onClick={onClose}
                    bounceOnClick
                />
                <ActionButton
                    icon={DownloadIcon}
                    label={t.transfer.receipt.download}
                    onClick={handleDownload}
                    bounceOnClick
                />
                <ActionButton
                    icon={ShareIcon}
                    label={t.transfer.receipt.share}
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
