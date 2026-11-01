'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import LockSvg from '../../assets/icons/auth/lock.svg';
import { NumericKeypad } from './NumericKeypad';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { appConfig } from '@/config/app';

interface PinInputsProps {
    value: string;
    onComplete: (value: string) => void;
    onChange: (value: string) => void;
    disabled: boolean;
    isValidPin?: 'valid' | 'notvalid' | 'reenter' | '';
    label?: string;
    /** Colour of the label under the inputs. 'error' renders it red. */
    labelTone?: 'default' | 'error';
    autoFocus?: boolean;
}

const PinInputs: React.FC<PinInputsProps> = ({
    isValidPin,
    value,
    onComplete,
    onChange,
    disabled,
    label,
    labelTone = 'default',
    autoFocus = true,
}) => {
    const isTouch = useIsTouchDevice();
    const { useCustomKeypad } = appConfig;
    const showCustomKeypad = useCustomKeypad && isTouch;

    const [pin, setPin] = useState<string[]>(Array(6).fill(''));
    const [shake, setShake] = useState(false);
    const [shakeNonce, setShakeNonce] = useState(0);
    const [keypadOpen, setKeypadOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const keypadRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    // Always-current ref so the click-outside closure reads live disabled state.
    const disabledRef = useRef(disabled);
    useEffect(() => { disabledRef.current = disabled; }, [disabled]);

    // Open keypad on mount (custom keypad only, when autoFocus is true)
    useEffect(() => {
        if (!disabled && showCustomKeypad && autoFocus) {
            const t = setTimeout(() => setKeypadOpen(true), 300);
            return () => clearTimeout(t);
        }
        // For system keyboard, auto-focus the hidden input
        if (!disabled && !showCustomKeypad && autoFocus) {
            const t = setTimeout(() => hiddenInputRef.current?.focus(), 300);
            return () => clearTimeout(t);
        }
    }, [disabled, showCustomKeypad, autoFocus]);

    // Restore keypad / focus when disabled transitions true → false
    useEffect(() => {
        if (!disabled && showCustomKeypad) {
            setKeypadOpen(true);
        } else if (!disabled && !showCustomKeypad) {
            if (document.activeElement !== hiddenInputRef.current) {
                hiddenInputRef.current?.focus();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled]);

    // Close keypad when clicking outside input AND keypad.
    // Guard with disabledRef so a touch on the last digit (which fires after
    // the component re-renders with disabled=true and unmounts the keypad)
    // never accidentally closes the keypad.
    useEffect(() => {
        if (!keypadOpen) return;
        function handleClick(e: MouseEvent | TouchEvent) {
            if (disabledRef.current) return;
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
            setShakeNonce((current) => current + 1);
            setShake(true);
            const t = setTimeout(() => setShake(false), 700);
            return () => clearTimeout(t);
        }
    }, [isValidPin]);

    const activeIndex =
        disabled ||
        (showCustomKeypad && !keypadOpen) ||
        (!showCustomKeypad && !isFocused)
            ? -1
            : pin.findIndex((d) => d === '');

    const addDigit = useCallback(
        (digit: string) => {
            setPin((prev) => {
                const firstEmpty = prev.findIndex((d) => d === '');
                if (firstEmpty === -1) return prev;
                const next = [...prev];
                next[firstEmpty] = digit;
                return next;
            });
            // Defer onChange/onComplete outside of setState to avoid updating parent during render
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
        if (isValidPin === 'valid') return ' border border-[#22C55E]/50';
        if (isValidPin === 'notvalid') return 'bg-white border border-dashed border-[#FF5F61]';
        if (digit) return 'bg-[#FCFCFC] border border-[#4D84FF]/50';
        if (isActive) return 'bg-[#FFFFFF] border border-dashed border-[#3066CC]';
        return 'bg-[#FFFFFF] border border-dashed border-[#C3C3C3]';
    };

    return (
        <>
            <div
                ref={inputRef}
                className="flex flex-col items-center gap-xd-5 w-full"
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
                    key={shakeNonce}
                    className={`flex items-center justify-center gap-xd-5 w-full ${shake ? 'animate-shake-horizontal' : ''}`}
                >
                    {pin.map((digit, i) => (
                        <div
                            key={i}
                            className={`relative size-xd-60 flex items-center my-xd-2 justify-center rounded-xd-15 transition-all duration-150 ${getBoxClass(digit, i)}`}
                        >
                            {digit && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Image
                                        src={LockSvg}
                                        alt="lock"
                                        width={22}
                                        height={22}
                                        className={`w-[42%] h-auto transition-all duration-200 ${
                                            isValidPin === 'valid'
                                                ? 'brightness-0 invert-[0.4] sepia saturate(1000%) hue-rotate(80deg)'
                                                : isValidPin === 'notvalid'
                                                  ? 'brightness-0 invert-[0.4] sepia saturate(1000%) hue-rotate(320deg)'
                                                  : 'opacity-100'
                                        }`}
                                        style={
                                            isValidPin === 'valid'
                                                ? undefined
                                                : isValidPin === 'notvalid'
                                                  ? undefined
                                                  : {
                                                        filter: 'brightness(0) saturate(100%) invert(29%) sepia(89%) saturate(2330%) hue-rotate(204deg) brightness(94%) contrast(101%)',
                                                    }
                                        }
                                    />
                                </div>
                            )}

                            {activeIndex === i &&
                                !digit &&
                                isValidPin !== 'valid' &&
                                isValidPin !== 'notvalid' && (
                                    <div className="w-[7%] aspect-square bg-[#8E8E8E] rounded-full animate-blink pointer-events-none" />
                                )}
                        </div>
                    ))}
                </div>
                {label && (
                    <p
                        className={`text-xd-11 mt-xd-8 ${
                            labelTone === 'error' ? 'text-[#FF5F61] font-medium' : 'text-[#1D1D1D]'
                        }`}
                    >
                        {label}
                    </p>
                )}
            </div>

            {showCustomKeypad ? (
                <NumericKeypad
                    // Keep the keypad visible while verifying (pending) or on an
                    // invalid passcode; only collapse it once the passcode is
                    // accepted. `disabled` still makes keys inert during pending
                    // so taps don't register mid-verification.
                    open={keypadOpen && isValidPin !== 'valid'}
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

export default PinInputs;
