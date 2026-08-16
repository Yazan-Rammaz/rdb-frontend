'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';

interface CountdownTimerProps {
    expiryTimestamp: string;
    onExpired: () => void;
    hideLabel?: boolean;
}

function formatExpiryDate(date: Date, locale: string): { time: string; date: string } {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate();
    const month = date.toLocaleString(locale, { month: 'long' });
    const year = date.getFullYear();
    return {
        time: `${hours}:${minutes}`,
        date: `${day} ${month} ${year}`,
    };
}

function formatCountdown(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
    expiryTimestamp,
    onExpired,
    hideLabel,
}) => {
    const { t, language } = useTranslation();

    // Keep latest onExpired in a ref — never triggers the effect
    const onExpiredRef = useRef(onExpired);
    onExpiredRef.current = onExpired;

    // Guard: fire onExpired exactly once
    const hasFiredRef = useRef(false);

    const getRemaining = useCallback(() => {
        const expiry = new Date(expiryTimestamp).getTime();
        return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    }, [expiryTimestamp]);

    const [remainingSeconds, setRemainingSeconds] = useState(getRemaining);

    useEffect(() => {
        // If already expired when mounted, fire once and stop
        if (getRemaining() <= 0) {
            if (!hasFiredRef.current) {
                hasFiredRef.current = true;
                onExpiredRef.current();
            }
            return;
        }

        const interval = setInterval(() => {
            const remaining = getRemaining();
            setRemainingSeconds(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                if (!hasFiredRef.current) {
                    hasFiredRef.current = true;
                    onExpiredRef.current();
                }
            }
        }, 1000);

        return () => clearInterval(interval);
        // Only re-run if the expiry timestamp itself changes
    }, [getRemaining]);

    const isExpired = remainingSeconds <= 0;
    const isWarning = !isExpired && remainingSeconds <= 60;

    const expiryDate = new Date(expiryTimestamp);
    const { time, date } = formatExpiryDate(expiryDate, language);

    return (
        <div className={hideLabel ? '' : 'mt-2'}>
            {!hideLabel && (
                <p className="text-[11px] text-[#8D8D8D] font-medium">
                    {t.transfer.deposit.validUntil}
                </p>
            )}
            <p className="text-[11px] text-[#8D8D8D] mt-0.5">
                <span
                    className={`tracking-widest ${isWarning ? 'text-[#FF4D4D]' : 'text-[#1D1D1D]'}`}
                >
                    {formatCountdown(remainingSeconds)}
                </span>{' '}
                {time} · {date}
            </p>
        </div>
    );
};

export default CountdownTimer;
