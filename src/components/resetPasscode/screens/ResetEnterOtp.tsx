'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import OtpInputs from '@/components/ui/OtpInputs';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import shieldSvg from '@/assets/icons/auth/shield.svg';
import closeSvg from '@/assets/icons/auth/close.svg';

interface ResetEnterOtpProps {
    phone?: string;
    method?: 'sms' | 'whatsapp' | '';
    pin: string;
    setPin: (pin: string) => void;
    isValidPin?: 'valid' | 'notvalid' | '';
    loading?: 'verify-pin' | 'resend-pin' | '';
    onSubmit: (pin: string) => void;
    onResend: () => void;
    changeNumber?: () => void;
    changeMethod?: () => void;
    onClose?: () => void;
    timerSeconds?: number;
}

/**
 * Reset-passcode OTP entry. Copy of the auth EnterPin screen, decoupled from the
 * auth actions (resend is handled by the `onResend` prop). Original untouched.
 */
export default function ResetEnterOtp({
    phone,
    method,
    pin,
    setPin,
    isValidPin = '',
    loading = '',
    onSubmit,
    onResend,
    changeNumber,
    changeMethod,
    onClose,
    timerSeconds = 120,
}: ResetEnterOtpProps) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState(timerSeconds);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0) {
            setCanResend(true);
            return;
        }
        if (loading === 'resend-pin') return;
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, loading]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePinComplete = (value: string) => {
        setPin(value);
        onSubmit(value);
    };

    const handleResend = () => {
        onResend();
        setTimeLeft(timerSeconds);
        setCanResend(false);
        setPin('');
    };

    const isExpired = canResend && !loading;
    const methodLabel = method === 'whatsapp' ? t.auth.enterPin.whatsapp : t.auth.enterPin.sms;

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

            <div className="w-full h-full flex flex-col">
                {/* Top half — title + OTP info */}
                <div className="h-1/2 flex flex-col justify-end px-xd-20">
                    <div className="h-xd-138 relative">
                        <h2 className="text-trim-descend text-xd-30 px-xd-20 font-bold text-[#1D1D1D]">
                            Reset Passcode !
                        </h2>
                        <div className="flex pl-xd-20 pt-xd-12 flex-col">
                            <p className="text-trim-descend text-xd-16 text-[#1D1D1D] font-medium">
                                {t.auth.enterPin.enterCodePrefix}
                                {methodLabel}
                            </p>
                            <div className="flex items-center pt-xd-8 gap-xd-5">
                                {!isExpired ? (
                                    <span className="text-trim-descend text-xd-12 font-normal text-[#C3C3C3]">
                                        {t.auth.enterPin.resendIn}
                                        <span className="text-[#388CFF] font-bold">
                                            {' '}
                                            {formatTime(timeLeft)}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="text-trim-descend text-xd-12 font-normal text-[#C3C3C3]">
                                        {t.auth.enterPin.didntReceive}
                                    </span>
                                )}
                            </div>
                            {isExpired && (
                                <div className="flex items-center pt-xd-8 gap-xd-5">
                                    <button
                                        onClick={handleResend}
                                        className="text-trim-descend text-xd-13 text-[#388CFF] underline"
                                    >
                                        {t.auth.enterPin.resendCode}
                                    </button>
                                    {changeNumber && (
                                        <>
                                            <span className="text-trim-descend text-xd-12 text-[#8E8E8E]">
                                                {t.auth.enterPin.or}
                                            </span>
                                            <button
                                                onClick={changeNumber}
                                                className="text-trim-descend text-xd-13 text-[#388CFF] underline"
                                            >
                                                {t.auth.enterPin.changeNumber}
                                            </button>
                                        </>
                                    )}
                                    {changeMethod && (
                                        <>
                                            <span className="text-trim-descend text-xd-12 text-[#8E8E8E]">
                                                {t.auth.enterPin.or}
                                            </span>
                                            <button
                                                onClick={changeMethod}
                                                className="text-trim-descend text-xd-13 text-[#388CFF] underline"
                                            >
                                                {t.auth.enterPin.changeMethod}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            <span className="flex items-center pt-xd-8 gap-xd-5">
                                <p className="text-trim-descend text-xd-12 font-normal text-[#C3C3C3]">
                                    {t.auth.enterPhone.privacyLine1}
                                </p>
                                <div className="w-xd-14 h-xd-14 shrink-0">
                                    <Image
                                        src={shieldSvg}
                                        alt="shield"
                                        width={14}
                                        height={14}
                                        className="object-contain text-[#C3C3C3]"
                                    />
                                </div>
                            </span>
                        </div>
                    </div>
                    <FlexibleSpace size={40} share={0} />
                </div>

                {/* Bottom half — OTP inputs */}
                <div className="h-1/2 flex flex-col items-center">
                    <FlexibleSpace size={30} share={0} />
                    <OtpInputs
                        value={pin}
                        onChange={setPin}
                        onComplete={handlePinComplete}
                        disabled={loading === 'verify-pin' || isValidPin === 'valid' || isExpired}
                        isValidPin={isValidPin}
                        isExpired={isExpired}
                    />
                    {isExpired && (
                        <p className="text-xd-11 pt-1 font-medium text-[#1D1D1D]">
                            {t.auth.enterPin.codeExpired}
                        </p>
                    )}
                    <FlexibleSpace grow />
                </div>
            </div>
        </div>
    );
}
