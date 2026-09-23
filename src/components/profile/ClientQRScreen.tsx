'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeDisplay } from '../QR/send/shared/QRCodeDisplay';
import verifiedBigIcon from '@/assets/icons/verification/verified-big.svg';
import notVerifiedIcon from '@/assets/icons/verification/not-verified.svg';
import CopyIcon from '@/assets/icons/home/qr/copy.svg';
import DownloadIcon from '@/assets/icons/home/qr/download.svg';
import ShareIcon from '@/assets/icons/home/qr/share.svg';
import { ActionButton } from '@/components/QR/shared/ActionButton';
import { shareQRImage } from '@/components/QR/shared/shareQRImage';
import { useTranslation } from '@/context/I18nContext';
import Image from 'next/image';

interface ClientQRScreenProps {
    onBack: () => void;
    displayId: string;
    clientName: string;
    phoneNumber?: string;
    isVerified?: boolean;
}

function formatAccountId(num?: string): string {
    if (!num) return '—';
    if (num.length <= 4) return num;
    return num.slice(0, -4).replace(/\d{4}/g, '$&-').replace(/-$/, '') + '-' + num.slice(-4);
}

export default function ClientQRScreen({
    onBack,
    displayId,
    clientName,
    phoneNumber,
    isVerified,
}: ClientQRScreenProps) {
    const { t, rtl } = useTranslation();
    const qrRef = useRef<HTMLDivElement>(null);

    const captureCanvas = async () => {
        const { default: html2canvas } = await import('html2canvas');
        if (!qrRef.current) throw new Error('no ref');
        return html2canvas(qrRef.current, { backgroundColor: '#ffffff', scale: 3 });
    };

    const handleCopy = async () => {
        const text = `${displayId}\n${clientName}\n+${phoneNumber}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            /* ignore */
        }
    };

    const handleDownload = async () => {
        const canvas = await captureCanvas();
        const link = document.createElement('a');
        link.download = `client-qr-ID${displayId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleShare = async () => {
        const canvas = await captureCanvas();
        await shareQRImage(canvas, `client-qr-ID${displayId}.png`);
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-20">
                <button
                    onClick={onBack}
                    aria-label={t.common.accessibility.back}
                    className="absolute start-xd-20 flex items-center text-[#1D1D1D]"
                >
                    {rtl ? (
                        <ChevronRight className="w-xd-22 h-xd-22" />
                    ) : (
                        <ChevronLeft className="w-xd-22 h-xd-22" />
                    )}
                </button>
                <span className="text-xd-16 font-medium text-[#1D1D1D]">
                    {t.profile.clientQr.title}
                </span>
            </div>

            {/* QR + info */}
            <div className="flex-1 flex flex-col items-center justify-start gap-xd-40 px-xd-30">
                {/* QR code */}
                <div ref={qrRef} className="bg-white p-xd-10">
                    <QRCodeDisplay
                        value={displayId && displayId !== '—' ? `ID ${displayId}` : '—'}
                        size={250}
                    />

                    {/* Account ID */}
                    <div className="flex justify-center items-center gap-xd-6 pt-xd-7">
                        <span className="font-medium text-[#1D1D1D] text-xd-16 leading-none">
                            {displayId && displayId !== '—' ? `ID ${displayId}` : '—'}
                        </span>
                    </div>
                </div>

                {/* Client details */}
                <div className="w-full flex flex-col gap-xd-4 mt-xd-10 items-center">
                    <div className="flex flex-col px-xd-12 pt-xd-7 pb-xd-8 w-xd-382 h-xd-55 bg-[#FCFCFC] rounded-xd-15 gap-xd-8">
                        <span className="text-xd-11 text-[#8E8E8E] leading-none">
                            {t.profile.clientQr.clientName}
                        </span>
                        <div className="flex items-center gap-xd-15">
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                {clientName}
                            </span>
                            <Image
                                src={isVerified ? verifiedBigIcon : notVerifiedIcon}
                                alt=""
                                width={18}
                                height={18}
                                className="object-contain size-xd-18"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col px-xd-12 pt-xd-7 pb-xd-8 w-xd-382 h-xd-55 bg-[#FCFCFC] rounded-xd-15 gap-xd-8">
                        <span className="text-xd-11 text-[#8E8E8E] leading-none">
                            {t.profile.clientQr.clientPhone}
                        </span>
                        <div className="flex items-center gap-xd-15">
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                +{phoneNumber}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom actions */}
            <div className="border-t border-[#f0f0f0] flex items-center justify-around py-xd-16 px-xd-20">
                <ActionButton
                    icon={CopyIcon}
                    label={t.home.qr.copy}
                    onClick={handleCopy}
                    bounceOnClick
                />
                <ActionButton
                    icon={DownloadIcon}
                    label={t.home.qr.download}
                    onClick={handleDownload}
                    bounceOnClick
                />
                <ActionButton
                    icon={ShareIcon}
                    label={t.home.qr.share}
                    onClick={handleShare}
                    bounceOnClick
                />
            </div>
        </div>
    );
}
