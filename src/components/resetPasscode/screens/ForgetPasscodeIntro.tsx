'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { FlexibleSpace } from '@/scaling';
import shieldSvg from '@/assets/icons/verification/shield.svg';
import closeSvg from '@/assets/icons/auth/close.svg';

interface ForgetPasscodeIntroProps {
    onStart: () => void;
    loading?: boolean;
    onClose?: () => void;
}

/**
 * "Forget Passcode !" intro (Image #1). Shown first for everyone; "Start Reset
 * Passcode" triggers the backend branch (face re-verify vs. phone+quiz).
 */
export default function ForgetPasscodeIntro({
    onStart,
    loading,
    onClose,
}: ForgetPasscodeIntroProps) {
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

            {/* Top half — title + intro copy, pinned to the midpoint */}
            <div className="h-1/2 flex flex-col justify-end px-xd-40">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Forget Passcode !</h2>
                    <p className="text-xd-16 font-medium text-[#1D1D1D] text-trim-descend mt-xd-10">
                        You Can Start Reset Your Passcode
                    </p>
                    <p className="text-xd-12 text-[#1D1D1D] mt-xd-8 leading-relaxed">
                        Don&apos;t Worry, We Will Help You Reset Your Passcode By Following These
                        Steps.
                    </p>
                </motion.div>
                <FlexibleSpace size={60} share={0.4} />
            </div>

            {/* Bottom half — security note + CTA pinned to the bottom */}
            <div className="h-1/2 flex flex-col items-center px-xd-30">
                <FlexibleSpace grow />
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
                    className="flex flex-col items-center"
                >
                    <div className="w-xd-20 h-xd-20 mb-xd-14">
                        <Image
                            src={shieldSvg}
                            alt="security"
                            className="w-xd-20 h-xd-20 object-contain"
                        />
                    </div>
                    <p className="text-xd-12 text-[#388CFF] text-center leading-relaxed">
                        Reset Your Passcode Is A Critically Important Security Measure To Ensure The
                        Safety Of Your Transactions.
                    </p>
                    <p className="text-xd-12 text-[#388CFF] text-center leading-relaxed mt-xd-14">
                        Therefore, We Apply Strict Procedures In This Regard.
                    </p>
                    <p className="text-xd-12 text-[#388CFF] text-center leading-relaxed mt-xd-14">
                        If You Wish To Proceed With Reset Your Passcode, Please Follow The Security
                        Instructions Below.
                    </p>
                </motion.div>

                <FlexibleSpace size={24} />

                <button
                    onClick={onStart}
                    disabled={loading}
                    className="w-xd-390 h-xd-60 rounded-xd-20 border border-dashed border-[#C3C3C3] bg-[#FCFCFC] text-[#1D1D1D] text-xd-16 font-medium flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                    Start Reset Passcode
                </button>
                <FlexibleSpace size={45} />
            </div>
        </div>
    );
}
