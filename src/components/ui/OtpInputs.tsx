'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NumericKeypad } from './NumericKeypad';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { appConfig } from '@/config/app';

interface OtpInputsProps {
    value: string;
    onComplete: (value: string) => void;
    onChange: (value: string) => void;
    disabled: boolean;
    isValidPin?: 'valid' | 'notvalid' | '';
    isExpired?: boolean;
}

const OtpInputs: React.FC<OtpInputsProps> = ({
    isValidPin,
    value,
    onComplete,
    onChange,
    disabled,
    isExpired = false,
}) => {
    const isTouch = useIsTouchDevice();
    const { useCustomKeypad } = appConfig;
    const showCustomKeypad = useCustomKeypad && isTouch;

    const [pin, setPin] = useState<string[]>(Array(6).fill(''));
    const [shake, setShake] = useState(false);
    const [keypadOpen, setKeypadOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const keypadRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Open keypad on mount (custom keypad only)
    useEffect(() => {
        if (!disabled && showCustomKeypad) {
            const t = setTimeout(() => setKeypadOpen(true), 300);
            return () => clearTimeout(t);
        }
        if (!disabled && !showCustomKeypad) {
            const t = setTimeout(() => hiddenInputRef.current?.focus(), 300);
            return () => clearTimeout(t);
        }
    }, [disabled, showCustomKeypad]);

    // Close keypad when clicking outside input AND keypad
    useEffect(() => {
        if (!keypadOpen) return;
        function handleClick(e: MouseEvent | TouchEvent) {
            const target = e.target as Node;
            if (inputRef.current && inputRef.current.contains(target)) return;
            if (keypadRef.current && keypadRef.current.contains(target)) return;
            setKeypadOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [keypadOpen]);

    useEffect(() => {
        const newPin = value.split('').slice(0, 6);
        while (newPin.length < 6) newPin.push('');
        setPin(newPin);
    }, [value]);

    useEffect(() => {
        if (isValidPin === 'notvalid') {
            setShake(true);
            const t = setTimeout(() => setShake(false), 700);
            return () => clearTimeout(t);
        }
    }, [isValidPin]);

    const activeIndex =
        disabled || (!showCustomKeypad && !isFocused) ? -1 : pin.findIndex((d) => d === '');

    const addDigit = useCallback(
        (digit: string) => {
            setPin((prev) => {
                const firstEmpty = prev.findIndex((d) => d === '');
                if (firstEmpty === -1) return prev;
                const next = [...prev];
                next[firstEmpty] = digit;
                return next;
            });
            const firstEmpty = pin.findIndex((d) => d === '');
            if (firstEmpty === -1) return;
            const next = [...pin];
            next[firstEmpty] = digit;
            const combined = next.join('');
            onChange(combined);
            if (next.every((d) => d !== '')) {
                setTimeout(() => onComplete(combined), 0);
            }
        },
        [pin, onChange, onComplete],
    );

    const removeDigit = useCallback(() => {
        setPin((prev) => {
            const lastFilled = [...prev].reverse().findIndex((d) => d !== '');
            if (lastFilled === -1) return prev;
            const idx = 5 - lastFilled;
            const next = [...prev];
            next[idx] = '';
            onChange(next.join(''));
            return next;
        });
    }, [onChange]);

    const getBoxClass = (digit: string, i: number) => {
        const isActive = activeIndex === i;
        if (isValidPin === 'valid') return 'border border-[#78D97F] bg-[#FCFFFC] rounded-xd-15';
        if (isValidPin === 'notvalid')
            return 'border border-dashed border-[#FF5F61] bg-white rounded-xd-15';
        if (isExpired && !digit)
            return 'border border-dashed border-[#FDCA57] bg-[#FCFCFC] rounded-xd-15';
        if (isExpired && digit)
            return 'border border-dashed border-[#FDCA57] bg-white rounded-xd-15';
        if (isActive) return 'border border-[#4D84FF]/50 border-dashed bg-white rounded-xd-15';
        if (digit) return 'border border-[#4D84FF]/50 bg-white rounded-xd-15';
        return 'border border-dashed border-[#C3C3C3] bg-[#FCFCFC] rounded-xd-15';
    };

    return (
        <>
            <div
                ref={inputRef}
                className="flex flex-col items-center w-full"
                onClick={() => {
                    if (disabled) return;
                    if (showCustomKeypad) setKeypadOpen(true);
                    else {
                        hiddenInputRef.current?.focus();
                        setIsFocused(true);
                    }
                }}
            >
                <div
                    className={`flex items-center justify-center gap-xd-5 w-full ${shake ? 'animate-shake-horizontal' : ''}`}
                >
                    {pin.map((digit, i) => (
                        <div
                            key={i}
                            className={`relative size-xd-60 flex items-center my-xd-2 justify-center transition-all duration-150 ${getBoxClass(digit, i)}`}
                        >
                            {activeIndex === i &&
                                !digit &&
                                isValidPin !== 'valid' &&
                                isValidPin !== 'notvalid' && (
                                    <div className="w-[7%] aspect-square bg-[#8E8E8E] rounded-full animate-blink pointer-events-none" />
                                )}

                            {digit && (
                                <span className="text-xd-16 font-semibold text-[#1D1D1D] pointer-events-none select-none">
                                    {digit}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showCustomKeypad ? (
                <NumericKeypad
                    // Keep the keypad visible while verifying (pending) or on an
                    // invalid code; only collapse it once the code is accepted
                    // or the code has expired. `disabled` still makes keys inert
                    // during pending so taps don't register mid-verification.
                    open={keypadOpen && isValidPin !== 'valid' && !isExpired}
                    onPress={addDigit}
                    onBackspace={removeDigit}
                    disabled={disabled}
                    keypadRef={keypadRef}
                />
            ) : (
                <input
                    ref={hiddenInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="sr-only"
                    value={value}
                    disabled={disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        onChange(digits);
                        if (digits.length === 6) onComplete(digits);
                    }}
                />
            )}
        </>
    );
};

export default OtpInputs;
