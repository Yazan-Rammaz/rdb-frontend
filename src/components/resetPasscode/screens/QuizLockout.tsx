'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FlexibleSpace } from '@/scaling';
import closeSvg from '@/assets/icons/auth/close.svg';

interface QuizLockoutProps {
    /** ISO timestamp when the user may try again. */
    lockedUntil: string;
    onExpired: () => void;
    onClose?: () => void;
}

function formatRemaining(ms: number): string {
    const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Quiz lockout screen (Image #5) — second failure. Shows a live countdown until
 * the backend-issued `lockedUntil`; escalation (5h → 12h → 2h) is backend policy.
 */
export default function QuizLockout({ lockedUntil, onExpired, onClose }: QuizLockoutProps) {
    const target = new Date(lockedUntil).getTime();
    const [remaining, setRemaining] = useState(() => target - Date.now());

    useEffect(() => {
        const tick = () => {
            const left = target - Date.now();
            setRemaining(left);
            if (left <= 0) onExpired();
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

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

            {/* Top half — title + warning */}
            <div className="h-1/2 flex flex-col justify-end px-xd-35">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                >
                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Reset Passcode !</h2>
                    <p className="text-xd-13 text-[#FF5F61] mt-xd-14 leading-relaxed">
                        &quot;You Have Given Second Attempt Incorrect Answers According To Our
                        Security Standards. So You Will Not Be Able To Try Again Until The Time
                        Below.&quot;
                    </p>
                    <p className="text-xd-13 text-[#1D1D1D] mt-xd-14 leading-relaxed">
                        &quot;If The Matter Is Urgent, You Can Visit One Of{' '}
                        <span className="text-[#4D84FF] underline">Our Centers</span> To Be
                        Help.&quot;
                    </p>
                </motion.div>
                <FlexibleSpace size={60} share={0.4} />
            </div>

            {/* Bottom half — countdown footer */}
            <div className="h-1/2 flex flex-col items-center px-xd-30">
                <FlexibleSpace grow />
                <div className="w-xd-390 h-xd-60 rounded-xd-20 bg-[#FAFAFA] flex items-center justify-center">
                    <p className="text-xd-15 text-[#FF5F61]">
                        You Can Try Again After{' '}
                        <span className="font-bold">{formatRemaining(remaining)} Hours</span>
                    </p>
                </div>
                <FlexibleSpace size={45} />
            </div>
        </div>
    );
}
