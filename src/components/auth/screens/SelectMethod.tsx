'use client';

import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import shieldSvg from '@/assets/icons/auth/shield.svg';
import simSvg from '@/assets/icons/auth/sim.svg';
import smsSvg from '@/assets/icons/auth/sms.svg';
import WhatsAppIcon from '@/assets/icons/auth/whatsapp.svg';
import closeSvg from '@/assets/icons/auth/close.svg';

interface SelectMethodScreenProps {
    setMethod: (method: 'sms' | 'whatsapp') => void;
    changeNumber: () => void;
    method: 'sms' | 'whatsapp' | '';
    phone?: string;
    authType: string;
    loading?: boolean;
    onClose?: () => void;
}

export default function SelectMethod({
    setMethod,
    method,
    changeNumber,
    phone,
    authType,
    loading = false,
    onClose,
}: SelectMethodScreenProps) {
    const { t } = useTranslation();

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close button */}
            <div className="flex absolute justify-end right-xd-30 top-xd-30">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-xd-24 h-xd-24 flex items-center justify-center"
                    >
                        <Image
                            src={closeSvg}
                            alt="close"
                            width={16}
                            height={16}
                            className="object-contain"
                        />
                    </button>
                )}
            </div>

            <FlexibleSpace size={0} share={0.3} />

            <div className="w-full h-full flex flex-col">
                {/* Top half — title + info */}
                <div className="h-1/2 flex flex-col justify-end px-xd-20">
                    <div className="h-xd-115">
                        <h2 className="text-trim-descend text-xd-30 px-xd-20 font-bold text-[#1D1D1D]">
                            {authType === 'signUp'
                                ? t.auth.enterPhone.signUpTitle
                                : t.auth.enterPhone.signInTitle}
                        </h2>
                        {/* gaps come from pt-xd-* on each row (text-trim makes each
                            box hug its glyphs, so the pt value == the visual gap) */}
                        <div className="flex px-xd-20 flex-col pt-xd-12">
                            <p className="text-trim-descend text-xd-16 text-[#1D1D1D] font-medium">
                                {t.auth.selectMethod.chooseMethod}
                            </p>
                            <div className="flex pt-xd-8 items-center gap-xd-5">
                                <span className="text-trim-descend text-xd-12 text-[#1D1D1D]">
                                    {t.auth.enterPhone.verificationInfo}
                                </span>
                                <div className="w-xd-15 h-xd-15 shrink-0">
                                    <Image
                                        src={simSvg}
                                        alt="sim"
                                        width={15}
                                        height={15}
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                            <div className="flex pt-xd-8 items-center gap-xd-6">
                                <p className="text-trim-descend text-xd-12 font-medium text-[#1D1D1D]">
                                    +{phone}
                                </p>
                                <button
                                    onClick={changeNumber}
                                    className="text-trim-descend text-xd-12 font-medium text-[#388CFF] underline"
                                >
                                    {t.auth.selectMethod.edit}
                                </button>
                            </div>
                            <div className="flex pt-xd-8 items-center gap-xd-6">
                                <span className="text-trim-descend text-xd-11 text-[#C3C3C3]">
                                    {t.auth.enterPhone.privacyLine1}
                                </span>
                                <div className="w-xd-14 h-xd-14 shrink-0">
                                    <Image
                                        src={shieldSvg}
                                        alt="shield"
                                        width={14}
                                        height={14}
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <FlexibleSpace size={60} share={0} />
                </div>

                {/* Bottom half — method buttons */}
                <div className="h-1/2 flex flex-col items-center">
                    <FlexibleSpace size={37} share={0} />
                    <div className="flex w-xd-400">
                        <button
                            onClick={() => !loading && setMethod('whatsapp')}
                            disabled={loading}
                            className={`relative my-1 mx-0.5 w-xd-193 flex flex-1 flex-col items-center justify-center h-xd-60 rounded-xd-20 border border-dashed transition-all disabled:cursor-not-allowed ${
                                method === 'whatsapp'
                                    ? 'border-[#388CFF] bg-[#FCFCFC]'
                                    : 'border-[#C3C3C3]'
                            }`}
                        >
                            <span
                                className={`absolute bg-white -top-2.5 left-xd-14 w-5 h-5 flex z-9999 items-center justify-center ${loading && method === 'whatsapp' ? 'animate-bounce-vertical' : ''}`}
                            >
                                <Image
                                    src={WhatsAppIcon}
                                    alt="whatsapp"
                                    className="size-xd-20 object-contain"
                                />
                            </span>
                            <span className="text-xd-16 font-normal text-[#1D1D1D]">
                                {t.auth.selectMethod.whatsapp}
                            </span>
                        </button>

                        <button
                            onClick={() => !loading && setMethod('sms')}
                            disabled={loading}
                            className={`relative my-1 mx-0.5 w-xd-193 flex flex-1 flex-col items-center justify-center h-xd-60 rounded-xd-20 border border-dashed transition-all disabled:cursor-not-allowed ${
                                method === 'sms'
                                    ? 'border-[#388CFF] bg-[#FCFCFC]'
                                    : 'border-[#C3C3C3]'
                            }`}
                        >
                            <span
                                className={`absolute bg-white -top-2.5 left-xd-14 w-5 h-5 z-9999 flex items-center justify-center ${loading && method === 'sms' ? 'animate-bounce-vertical' : ''}`}
                            >
                                <Image
                                    src={smsSvg}
                                    alt="sms"
                                    className="size-xd-20 object-contain"
                                />
                            </span>
                            <span className="text-xd-16 text-[#1D1D1D]">
                                {t.auth.selectMethod.sms}
                            </span>
                        </button>
                    </div>
                    <FlexibleSpace grow />
                </div>
            </div>
        </div>
    );
}
