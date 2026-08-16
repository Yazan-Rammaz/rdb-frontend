'use client';

import React from 'react';
import Image from 'next/image';

// Icons
import SendTIcon from '@/assets/icons/home/qr/sendT.svg';
import CashWithdrawIcon from '@/assets/icons/home/qr/cashwithdraw.svg';
import BillPaymentsIcon from '@/assets/icons/home/qr/billpayments.svg';
import SheinIcon from '@/assets/icons/home/qr/shein.svg';
import AmazonIcon from '@/assets/icons/home/qr/amazon.svg';
import PaypalIcon from '@/assets/icons/home/qr/paypal.svg';
import SyriatelIcon from '@/assets/icons/home/qr/syriatel.svg';
import MtnIcon from '@/assets/icons/home/qr/mtn.svg';
import NetflixIcon from '@/assets/icons/home/qr/netflix.svg';
import YoutubeIcon from '@/assets/icons/home/qr/youtube.svg';
import TitleIcon from '@/assets/icons/layout/header/send.svg';
import { useTranslation } from '@/context/I18nContext';

// ============================================================================
// TYPES
// ============================================================================

interface OptionLink {
    label: string;
    className?: string;
}

interface Merchant {
    src: string;
    label: string;
}

interface Option {
    icon: string;
    iconAlt: string;
    label: string;
    sublabel: string;
    links: OptionLink[];
    merchants?: Merchant[];
}

// ============================================================================
// DATA
// ============================================================================

// ============================================================================
// COMPONENT
// ============================================================================

interface SendChooseProps {
    onNavigate?: (page: 'scan' | 'sendChoose' | 'transferSend') => void;
}

const SendChoose: React.FC<SendChooseProps> = ({ onNavigate }) => {
    const { t, tr } = useTranslation();
    // translated options
    const OPTIONS: Option[] = [
        {
            icon: SendTIcon,
            iconAlt: tr('send.transfer.icon_alt'),
            label: tr('send.transfer.label'),
            sublabel: tr('send.transfer.description'),
            links: [{ label: tr('common.history') }],
        },
        {
            icon: CashWithdrawIcon,
            iconAlt: tr('send.withdraw.icon_alt'),
            label: tr('send.withdraw.label'),
            sublabel: tr('send.withdraw.description'),
            links: [
                { label: tr('send.withdraw.nearby_centers'), className: 'hover:text-blue-500' },
                { label: tr('common.history') },
            ],
        },
        {
            icon: BillPaymentsIcon,
            iconAlt: tr('send.bills.icon_alt'),
            label: tr('send.bills.label'),
            sublabel: tr('send.bills.description'),
            links: [{ label: tr('common.history') }],
            merchants: [
                { src: SheinIcon, label: 'Shein' },
                { src: AmazonIcon, label: 'Amazon' },
                { src: PaypalIcon, label: 'Paypal' },
                { src: SyriatelIcon, label: 'Syriatel' },
                { src: MtnIcon, label: 'MTN' },
                { src: NetflixIcon, label: 'Netflix' },
                { src: YoutubeIcon, label: 'YouTube' },
            ],
        },
    ];
    return (
        <div className="flex flex-col items-center px-6 pb-4 w-full max-w-md mx-auto">
            {/* Header Icon and Title */}
            <div className="flex flex-col items-center mb-4">
                <div className="rounded-xl mb-4">
                    <Image src={TitleIcon} alt="Send" width={40} height={40} />
                </div>
                <h2 className="text-[13px] font-medium tracking-widest text-[#1D1D1D] uppercase">
                    {tr('send.header_title')}
                </h2>
            </div>

            {/* Options List */}
            <div className="w-full space-y-1">
                {OPTIONS.map((option, i) => (
                    <div
                        key={i}
                        className="bg-[#F8F8F8] rounded-2xl p-2 flex flex-col gap-0 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                            if (i === 0 && onNavigate) {
                                onNavigate('transferSend');
                            }
                        }}
                    >
                        {/* Main row */}
                        <div className="flex items-end justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center">
                                    <Image
                                        src={option.icon}
                                        alt={option.iconAlt}
                                        width={32}
                                        height={32}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[#1D1D1D] text-[13px] font-medium">
                                        {option.label}
                                    </span>
                                    <span className="text-[11px] text-[#8D8D8D] font-normal">
                                        {option.sublabel}
                                    </span>
                                </div>
                            </div>

                            {/* Links - At right, stacked if multiple */}
                            <div className="flex flex-col items-end p-2 gap-1">
                                {option.links.map((link, j) => (
                                    <span
                                        key={j}
                                        className={`text-[11px] text-[#8D8D8D] underline whitespace-nowrap ${link.className ?? 'hover:text-gray-600'}`}
                                    >
                                        {link.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Merchant logos — only rendered when present */}
                        {option.merchants && (
                            <div className="flex items-center justify-between gap-1 px-3 overflow-x-auto no-scrollbar py-0">
                                {option.merchants.map((logo, j) => (
                                    <div
                                        key={j}
                                        className="relative w-17.5 gap-1 flex flex-col items-center"
                                    >
                                        <div className="relative w-17.5 h-16 rounded-full flex items-center justify-center overflow-hidden">
                                            <Image
                                                src={logo.src}
                                                alt={logo.label}
                                                fill
                                                className="shadow-sm object-contain"
                                            />
                                        </div>
                                        <span className="text-[13px] text-[#1D1D1D] font-normal">
                                            {logo.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SendChoose;
