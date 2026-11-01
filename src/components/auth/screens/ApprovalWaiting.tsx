'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import { RdbIcon } from '../../icons';
import closeSvg from '@/assets/icons/auth/close.svg';

interface ApprovalWaitingScreenProps {
    /** ISO timestamp when the approval request expires (~3 min). */
    expiresAt?: string;
    onCancel?: () => void;
}

const ACCENT = '#388CFF';
const ACCENT_SOFT = '#EAF2FF';

/**
 * Waiting-for-app-approval screen (phone-OTP login while an app session is active).
 * Matches the app's design language (colors, fonts, FlexibleSpace scaling) with
 * iOS-style motion: concentric pulse rings, a breathing icon, animated dots and a
 * live countdown. Purely presentational — polling lives in the auth page.
 */
export default function ApprovalWaitingScreen({ expiresAt, onCancel }: ApprovalWaitingScreenProps) {
    const { t } = useTranslation();
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!expiresAt) return;
        const target = new Date(expiresAt).getTime();
        if (Number.isNaN(target)) return;
        const tick = () => setSecondsLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const countdown =
        secondsLeft != null
            ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
            : null;

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close */}
            <div className="flex absolute justify-end right-xd-30 top-xd-30 z-10">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        aria-label="cancel"
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

            <FlexibleSpace grow share={0.5} />

            {/* Pulsing phone badge */}
            <div className="flex flex-col items-center">
                <div className="relative w-xd-170 h-xd-170 flex items-center justify-center">
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: '100%',
                                height: '100%',
                                border: `1.5px solid ${ACCENT}`,
                            }}
                            initial={{ scale: 0.5, opacity: 0.45 }}
                            animate={{ scale: 1.15, opacity: 0 }}
                            transition={{
                                duration: 2.4,
                                repeat: Infinity,
                                ease: 'easeOut',
                                delay: i * 0.8,
                            }}
                        />
                    ))}
                    <motion.div
                        className="relative w-xd-96 h-xd-96 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: ACCENT_SOFT }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <RdbIcon className="w-xd-46 h-xd-46" />
                    </motion.div>
                </div>

                <FlexibleSpace size={44} share={0} />

                <div className="flex flex-col items-center text-center px-xd-32">
                    <h2 className="text-xd-26 font-bold text-[#1D1D1D]">{t.auth.approval.title}</h2>
                    <p className="text-xd-15 font-medium text-[#5D5C5D] mt-xd-12 leading-[1.6] w-xd-340">
                        {t.auth.approval.description}
                    </p>

                    {/* Animated waiting dots */}
                    <div className="flex items-center gap-xd-8 mt-xd-26">
                        <span className="flex gap-xd-5">
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    className="w-xd-7 h-xd-7 rounded-full"
                                    style={{ backgroundColor: ACCENT }}
                                    animate={{ opacity: [0.25, 1, 0.25] }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </span>
                        <span className="text-xd-13 font-medium text-[#8E8E8E]">
                            {t.auth.approval.waiting}
                        </span>
                    </div>

                    {countdown && (
                        <p className="text-xd-13 font-medium text-[#8E8E8E] mt-xd-16">
                            {t.auth.approval.expiresIn}{' '}
                            <span className="text-[#1D1D1D] font-bold tabular-nums">
                                {countdown}
                            </span>
                        </p>
                    )}
                </div>
            </div>

            <FlexibleSpace grow share={0.5} />

            {/* Cancel */}
            <div className="flex flex-col items-center pb-xd-45">
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-xd-14 font-medium text-[#4D84FF] transition-opacity hover:opacity-70"
                    >
                        {t.auth.approval.cancel}
                    </button>
                )}
            </div>
        </div>
    );
}
