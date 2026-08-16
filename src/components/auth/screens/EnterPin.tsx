'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import OtpInputs from '@/components/ui/OtpInputs';
import { useActions } from '@/hooks/useActions';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import simSvg from '@/assets/icons/auth/sim.svg';
import shieldSvg from '@/assets/icons/auth/shield.svg';
import InfoSvg from '@/assets/icons/auth/info.svg';
import closeSvg from '@/assets/icons/auth/close.svg';

interface EnterPinScreenProps {
    onSubmit: (pin: string) => void;
    changeMethod?: () => void;
    changeNumber?: () => void;
    onClose?: () => void;
    phone?: string;
    method?: string;
    pin: string;
    authType?: string;
    setPin: (pin: string) => void;
    setLoading?: (loading: 'resend-pin' | 'verify-pin' | '') => void;
    setSessionInfo?: (sessionInfo: string) => void;
    loading?: string;
    isValidPin?: 'valid' | 'notvalid' | '';
    // Override props for non-phone OTP flows (e.g. IP verification)
    overrideTitle?: string;
    overrideSubtitle?: string;
    timerSeconds?: number; // default 120; pass 600 for 10-min IP OTP
    onResend?: () => void; // custom resend handler; hides phone-resend logic when provided
}

export default function EnterPin({
    onSubmit,
    changeMethod,
    changeNumber,
    onClose,
    phone,
    method,
    pin,
    authType,
    setPin,
    setLoading,
    setSessionInfo,
    loading = '',
    isValidPin = '',
    overrideTitle,
    overrideSubtitle,
    timerSeconds = 120,
    onResend,
}: EnterPinScreenProps) {
    const { t } = useTranslation();
    const actions = useActions();
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

    const handleResend = async () => {
        if (onResend) {
            onResend();
            setTimeLeft(timerSeconds);
            setCanResend(false);
            setPin('');
            return;
        }
        setLoading?.('resend-pin');
        const res = await actions.auth.reSendOtp({
            phoneNumber: `+${phone}`,
            channel: method === 'whatsapp' ? 'whatsapp' : 'sms',
        });
        setLoading?.('');
        if ('error' in res) return;
        if (res.sessionInfo) {
            setTimeLeft(timerSeconds);
            setCanResend(false);
            setPin('');
            setSessionInfo?.(res.sessionInfo);
        }
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
                            {overrideTitle ??
                                (authType === 'signUp'
                                    ? t.auth.enterPhone.signUpTitle
                                    : t.auth.enterPhone.signInTitle)}
                        </h2>
                        {/* gaps come from pt-xd-* on each row (text-trim makes each
                            box hug its glyphs, so the pt value == the visual gap) */}
                        <div className="flex pl-xd-20 pt-xd-12 flex-col">
                            <p className="text-trim-descend text-xd-16 text-[#1D1D1D] font-medium">
                                {overrideSubtitle ?? (
                                    <>
                                        {t.auth.enterPin.enterCodePrefix}
                                        {methodLabel}
                                    </>
                                )}
                            </p>
                            {/* Phone-specific info — hidden in override mode */}
                            {!overrideTitle && (
                                <div className="flex items-center pt-xd-8 gap-xd-5">
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
                            )}
                            <div className="flex items-center pt-xd-8 gap-xd-5">
                                {!overrideTitle && (
                                    <span className="text-trim-descend text-xd-12 font-normal text-[#1D1D1D]">
                                        +{phone}
                                    </span>
                                )}
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
                                {!overrideTitle && (
                                    <div className="w-xd-15 h-xd-15 shrink-0">
                                        <Image
                                            src={InfoSvg}
                                            alt="info"
                                            width={15}
                                            height={15}
                                            className="object-contain text-[#C3C3C3]"
                                        />
                                    </div>
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
                                    {!overrideTitle && changeNumber && (
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
                                    {!overrideTitle && changeMethod && (
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
                    {/* <FlexibleSpace size={!isExpired ? 37 : 37} share={0} /> */}
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
