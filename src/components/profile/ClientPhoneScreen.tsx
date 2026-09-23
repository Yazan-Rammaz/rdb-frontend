'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import warnSvg from '@/assets/icons/profile/warn.svg';
import phoneSvg from '@/assets/icons/profile/phone.svg';
import { useTranslation } from '@/context/I18nContext';

interface ClientPhoneScreenProps {
    onBack: () => void;
    phoneNumber?: string;
}

export default function ClientPhoneScreen({ onBack, phoneNumber }: ClientPhoneScreenProps) {
    const { t, rtl } = useTranslation();
    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-10 border-b border-[#f0f0f0]">
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
                <div className="flex items-center gap-xd-8">
                    <div className="relative size-xd-18 shrink-0">
                        <Image src={phoneSvg} alt="" fill className="object-contain" />
                    </div>
                    <span className="text-xd-16 font-medium text-[#1D1D1D]">
                        {t.profile.clientPhone.title}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-xd-12 pt-xd-16 pb-xd-20 flex flex-col gap-xd-10 items-center">
                {/* Phone number field */}
                <div className="border border-[#C3C3C3]/50 w-xd-406 bg-[#FFFFFF] rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                    <div className="flex flex-col gap-xd-6 flex-1">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">
                            {t.profile.clientPhone.label}
                        </span>
                        <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none py-xd-4">
                            +{phoneNumber}
                        </span>
                    </div>
                </div>

                {/* Add second phone number */}
                <button
                    type="button"
                    className="flex items-center gap-xd-6 text-[#8D8D8D] text-xd-13"
                >
                    <span className="text-xd-20 leading-none">⊕</span>
                    <span>{t.profile.clientPhone.addSecond}</span>
                </button>

                {/* Info box 1 */}
                <div className="w-xd-406 bg-[#F2FFF0] rounded-xd-15 px-xd-12 py-xd-10 flex items-start gap-xd-8">
                    <div className="relative size-xd-14 shrink-0 mt-xd-2">
                        <Image src={warnSvg} alt="" fill className="object-contain" />
                    </div>
                    <div className="flex flex-col gap-xd-4">
                        <span className="font-medium text-xd-11 text-[#8D8D8D] leading-tight">
                            {t.profile.clientPhone.ownTitle}
                        </span>
                        <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                            {t.profile.clientPhone.ownDesc}
                        </span>
                    </div>
                </div>

                {/* Info box 2 */}
                <div className="w-xd-406 bg-[#F2FFF0] rounded-xd-15 px-xd-12 py-xd-10 flex items-start gap-xd-8">
                    <div className="relative size-xd-14 shrink-0 mt-xd-2">
                        <Image src={warnSvg} alt="" fill className="object-contain" />
                    </div>
                    <div className="flex flex-col gap-xd-4">
                        <span className="font-medium text-xd-11 text-[#8D8D8D] leading-tight">
                            {t.profile.clientPhone.importantTitle}
                        </span>
                        <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                            {t.profile.clientPhone.importantDesc}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom */}
            <div className="px-xd-12 pb-xd-24 flex items-center justify-center">
                <button type="button" className="text-xd-13 text-[#3066CC]">
                    {t.profile.clientPhone.needHelp}
                </button>
            </div>
        </div>
    );
}
