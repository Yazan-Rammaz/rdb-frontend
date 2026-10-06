'use client';
import { api } from '@/api';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import OtpInputs from '@/components/ui/OtpInputs';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import InlineFeedback from '@/components/ui/InlineFeedback';
import type { Feedback } from '@/hooks/useInlineFeedback';
import simSvg from '@/assets/icons/auth/sim.svg';
import shieldSvg from '@/assets/icons/auth/shield.svg';
import InfoSvg from '@/assets/icons/auth/info.svg';
import closeSvg from '@/assets/icons/auth/close.svg';
import { toE164 } from '@/lib/phoneValidation';

/**
 * Seconds from a successful send until "resend" unlocks. The backend returns no
 * expiry, so the countdown is measured from the moment the send succeeded. It
 * is UX only — the server decides whether a code is still valid.
 */
export const OTP_TIMER_SECONDS = 120;

const secondsUntil = (deadline: number) =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

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
    /** When "resend" unlocks (epoch ms). Owned by the page so a reload resumes it. */
    expiresAt: number;
    /** A resend succeeded: the new deadline. */
    onExpiresAtChange: (expiresAt: number) => void;
    /** Offline: the code stays typed but cannot be submitted or resent. */
    disabled?: boolean;
    /** A result line (code sent, wrong code…) — shown under the boxes, over "code expired". */
    feedback?: Feedback | null;
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
    expiresAt,
    onExpiresAtChange,
    disabled = false,
    feedback = null,
}: EnterPinScreenProps) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState(() => secondsUntil(expiresAt));

    // Read from the clock on every tick, never decremented: a reload, a
    // background tab or a locked phone cannot make the countdown fall behind.
    // 500 ms so timer jitter never skips a second; same-second ticks don't render.
    useEffect(() => {
        const tick = () => {
            const left = secondsUntil(expiresAt);
            setTimeLeft(left);
            return left;
        };
        if (tick() === 0) return;
        const interval = setInterval(() => {
            if (tick() === 0) clearInterval(interval);
        }, 500);
        // A hidden tab's timers are throttled: catch up the moment it shows.
        const onVisible = () => {
            if (!document.hidden) tick();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [expiresAt]);

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
        if (disabled) return;
        // Without a valid number this would be a request for `+undefined`.
        const phoneNumber = toE164(phone ?? '');
        if (!phoneNumber) return;
        setLoading?.('resend-pin');
        const res = await api.auth.resendOtp({
            phoneNumber,
            channel: method === 'whatsapp' ? 'whatsapp' : 'sms',
        });
        setLoading?.('');
        if (!res.ok) return;
        if (res.data.sessionInfo) {
            // Only a confirmed send restarts the countdown.
            onExpiresAtChange(Date.now() + OTP_TIMER_SECONDS * 1000);
            setPin('');
            setSessionInfo?.(res.data.sessionInfo);
        }
    };

    const isExpired = timeLeft <= 0 && !loading;
    const methodLabel = method === 'whatsapp' ? t.auth.enterPin.whatsapp : t.auth.enterPin.sms;

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close button */}
            <div className="flex absolute justify-end end-xd-30 top-xd-30">
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
                                    // LTR, or RTL copy pushes the `+` to the far end.
                                    <span
                                        dir="ltr"
                                        className="text-trim-descend text-xd-12 font-normal text-[#1D1D1D]"
                                    >
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
                                        disabled={disabled}
                                        className="text-trim-descend text-xd-13 text-[#388CFF] underline disabled:opacity-50"
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
                        disabled={
                            disabled || loading === 'verify-pin' || isValidPin === 'valid' || isExpired
                        }
                        isValidPin={isValidPin}
                        isExpired={isExpired}
                    />
                    {/* One slot under the boxes: a feedback line wins over "code
                        expired" while it is up. Only the grow spacer is below it,
                        so nothing on screen moves. It sits well above the custom
                        keypad, which rises from the bottom edge on touch devices. */}
                    <div className="w-full flex flex-col items-center pt-1 px-xd-20">
                        {isExpired && !feedback && (
                            <p className="text-xd-11 font-medium text-[#1D1D1D]">
                                {t.auth.enterPin.codeExpired}
                            </p>
                        )}
                        <InlineFeedback feedback={feedback} className="w-full" />
                    </div>
                    <FlexibleSpace grow />
                </div>
            </div>
        </div>
    );
}
