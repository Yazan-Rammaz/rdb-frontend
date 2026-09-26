'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { FlexibleSpace } from '@/scaling';
import { useTranslation } from '@/context/I18nContext';
import closeSvg from '@/assets/icons/auth/close.svg';

interface QuizFailOnceProps {
    onRetry: () => void;
    onClose?: () => void;
    /** Offline: retrying needs the server to hand out a fresh question set. */
    disabled?: boolean;
}

/**
 * Quiz first-failure screen (Image #4) — one attempt left.
 */
export default function QuizFailOnce({ onRetry, onClose, disabled = false }: QuizFailOnceProps) {
    const { t } = useTranslation();
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
                            alt=""
                            width={16}
                            height={16}
                            className="object-contain"
                        />
                    </button>
                )}
            </div>

            {/* Top half — title + warning */}
            <div className="h-1/2 flex flex-col justify-end px-xd-35">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">
                        {t.resetPasscode.failOnce.title}
                    </h2>
                    <p className="text-xd-13 text-[#FF5F61] mt-xd-14 leading-relaxed">
                        {t.resetPasscode.failOnce.message}
                    </p>
                </motion.div>
                <FlexibleSpace size={60} share={0.4} />
            </div>

            {/* Bottom half — retry CTA */}
            <div className="h-1/2 flex flex-col items-center px-xd-30">
                <FlexibleSpace grow />
                <button
                    onClick={onRetry}
                    disabled={disabled}
                    className="w-xd-390 h-xd-60 rounded-xd-20 border border-dashed border-[#C3C3C3] bg-[#FCFCFC] text-[#1D1D1D] text-xd-16 font-medium flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {t.resetPasscode.failOnce.retryButton}
                </button>
                <FlexibleSpace size={45} />
            </div>
        </div>
    );
}
