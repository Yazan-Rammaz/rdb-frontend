'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';

interface AuthSuccessScreenProps {
    variant: 'login' | 'signup';
    onDone?: () => void;
    delayMs?: number;
}

const variantStyles = {
    login: { bg: '#E0FFEE', cls: 'outer-bg-login' },
    signup: { bg: '#E0FFEE', cls: 'outer-bg-signup' },
};

export default function AuthSuccessScreen({
    variant,
    onDone,
    delayMs = 1500,
}: AuthSuccessScreenProps) {
    const { t } = useTranslation();
    const { bg, cls } = variantStyles[variant];
    const copy = variant === 'signup' ? t.auth.signUpSuccess : t.auth.loginSuccess;

    // Keep a ref to onDone so the timer is never reset by parent re-renders.
    // The timer fires exactly once after delayMs ms from mount.
    const onDoneRef = useRef(onDone);
    useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

    useEffect(() => {
        const timer = setTimeout(() => onDoneRef.current?.(), delayMs);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [delayMs]);

    return (
        <div className={`w-full h-full flex flex-col ${cls}`} style={{ backgroundColor: bg }}>
            {/* Top space — absorbs 50% of vertical change */}
            <FlexibleSpace size={366} share={0.5} />

            {/* Centered content */}
            <div className="flex flex-col items-center text-center px-xd-30">
                <h2 className="text-xd-30 font-bold text-[#1D1D1D]">{copy.title}</h2>
                <p className="text-xd-16 mt-xd-5 text-[#1D1D1D] font-medium">{copy.subtitle}</p>
            </div>

            {/* Bottom space — absorbs 50% of vertical change */}
            <FlexibleSpace size={566} share={0.5} />
        </div>
    );
}
