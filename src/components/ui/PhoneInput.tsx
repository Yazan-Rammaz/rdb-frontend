'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ArrowRight from '@/assets/icons/auth/arrow-right.svg';
import Phone from '@/assets/icons/auth/phone.svg';
import PhoneCursor from '@/assets/icons/auth/phone-cursor.svg';
import { useTranslation } from '@/context/I18nContext';
import Image from 'next/image';
import { NumericKeypad } from './NumericKeypad';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { appConfig } from '@/config/app';
import {
    E164_MAX_DIGITS,
    findCountry,
    normalizePhoneDigits,
    phoneIssue,
} from '@/lib/phoneValidation';

/**
 * The longest dial code is three digits, so three is the first point at which
 * "this matches no country" is a final verdict rather than a half-typed one.
 * Below it the customer is still typing and nothing is said.
 */
const MIN_DIGITS_TO_JUDGE = 3;

const ERROR_MESSAGE_ID = 'phone-input-error';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend?: () => void;
    isLoading?: boolean;
    placeholder?: string;
}

export default function PhoneInput({
    value,
    onChange,
    onSend,
    isLoading = false,
    placeholder = 'Phone Number',
}: PhoneInputProps) {
    const { t } = useTranslation();
    const isTouch = useIsTouchDevice();
    const { useCustomKeypad } = appConfig;
    const showCustomKeypad = useCustomKeypad && isTouch;

    const [isFocused, setIsFocused] = useState(false);
    const [keypadOpen, setKeypadOpen] = useState(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const keypadRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoading && showCustomKeypad) {
            const t = setTimeout(() => setKeypadOpen(true), 300);
            return () => clearTimeout(t);
        }
        if (!isLoading && !showCustomKeypad) {
            const t = setTimeout(() => {
                hiddenInputRef.current?.focus();
                setIsFocused(true);
            }, 300);
            return () => clearTimeout(t);
        }
    }, [isLoading, showCustomKeypad]);

    // Close keypad when clicking outside input AND keypad
    useEffect(() => {
        if (!keypadOpen) return;
        function handleClick(e: MouseEvent | TouchEvent) {
            const target = e.target as Node;
            if (inputRef.current && inputRef.current.contains(target)) return;
            if (keypadRef.current && keypadRef.current.contains(target)) return;
            setKeypadOpen(false);
            setIsFocused(false);
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [keypadOpen]);

    // `000963994277533` and `+963 994 277 533` are the same number, and this is
    // where they become the same string. Everything below derives from `digits`.
    const digits = normalizePhoneDigits(value);

    // The parent owns the value and hands it to the API, so it is not enough
    // for the canonical form to exist only in here: a number restored from the
    // auth-flow cookie would display normalised while the state behind it — and
    // the "code sent to +…" line on the next two screens — stayed raw. One
    // pass settles it, since normalising a normalised value changes nothing.
    useEffect(() => {
        if (digits !== value) onChange(digits);
    }, [digits, value, onChange]);

    const detectedCountry = useMemo(() => findCountry(digits), [digits]);

    const formatNumber = useCallback((d: string): string => {
        if (!d) return '';
        const dialCode = findCountry(d)?.dialCode ?? '';
        const rest = d.slice(dialCode.length);
        const groups = rest.match(/.{1,3}/g) || [];
        return (dialCode ? [dialCode, ...groups] : groups).join(' ');
    }, []);

    const displayValue = useMemo(() => formatNumber(digits), [digits, formatNumber]);

    // Only a keypad stop. Nothing truncates on this cap any more — see the
    // native input's onChange for why that mattered.
    const maxTotalDigits = useMemo(() => {
        if (!detectedCountry) return E164_MAX_DIGITS;
        return detectedCountry.dialCode.length + detectedCountry.maxLocal;
    }, [detectedCountry]);

    const issue = useMemo(() => phoneIssue(digits), [digits]);
    const isValidPhone = issue === null;

    // A first `0` is dropped by normalisation, which on the custom keypad looks
    // exactly like a dead key — the only feedback a press gets is a 40ms tint.
    // Someone dialling `00963…` from memory presses it twice. Say why instead.
    const [showedLeadingZero, setShowedLeadingZero] = useState(false);

    const errorMessage = useMemo(() => {
        const { missingCountryCode, unsupportedCountry } = t.auth.enterPhone.errors;
        if (showedLeadingZero) return missingCountryCode;
        // A number that is merely unfinished is not a mistake; the absent send
        // arrow already says "not yet". Only an unmatchable prefix is final,
        // and it is final as soon as it is three digits long.
        if (digits.length < MIN_DIGITS_TO_JUDGE) return '';
        if (issue === 'missing-country-code') return missingCountryCode;
        if (issue === 'unsupported-country') return unsupportedCountry;
        return '';
    }, [issue, digits, showedLeadingZero, t]);

    const handleKeypadPress = useCallback(
        (digit: string) => {
            if (digits.length >= maxTotalDigits) return;
            const next = normalizePhoneDigits(digits + digit);
            setShowedLeadingZero(next === digits);
            if (next !== digits) onChange(next);
        },
        [digits, onChange, maxTotalDigits],
    );

    const handleKeypadBackspace = useCallback(() => {
        setShowedLeadingZero(false);
        if (digits.length > 0) {
            onChange(digits.slice(0, -1));
        }
    }, [digits, onChange]);

    return (
        <div className="flex flex-col w-full items-center">
            {/* `relative` so the hint hangs below the field without taking
                layout: both host screens pin this into a fixed w-xd-390 h-xd-60
                box, and a flow child would push straight out of it. */}
            <div className="relative flex w-full items-center justify-center">
                {/* A phone number is digits, so the field is LTR content in
                    every language, as on the App. Under the inherited dir=rtl
                    the row mirrored — `+` after the digits — and the bidi
                    algorithm painted the space-separated groups in reverse.
                    The error line below is a sibling, so it stays RTL. */}
                <div
                    ref={inputRef}
                    dir="ltr"
                    onClick={() => {
                        setIsFocused(true);
                        if (showCustomKeypad) setKeypadOpen(true);
                        else hiddenInputRef.current?.focus();
                    }}
                    className={`relative m-1 flex items-center gap-1 w-full h-xd-60 rounded-xd-20 border border-dashed px-xd-16 transition-colors cursor-text ${
                        isFocused || isValidPhone ? 'border-[#388CFF]' : 'border-[#C3C3C3]'
                    }`}
                >
                    {/* Country flag on border */}
                    {detectedCountry && (
                        <span className="absolute -top-[6.5px] start-xd-16 w-xd-20 h-xd-13 shrink-0 overflow-hidden rounded-sm">
                            <img
                                src={`https://flagcdn.com/w40/${detectedCountry.code.toLowerCase()}.png`}
                                alt="flag"
                                className="w-full h-full object-cover"
                            />
                        </span>
                    )}

                    {/* Phone icon — dims when valid */}
                    <Image
                        src={Phone}
                        alt="phone"
                        className={`object-contain size-xd-20 transition-opacity ${digits ? 'opacity-100' : 'opacity-50'}`}
                    />

                    {/* Plus sign */}
                    <span
                        className={`${digits ? 'text-[#1D1D1D]' : 'text-[#8D8D8D]'} text-xd-16 font-medium pl-3 shrink-0 select-none`}
                    >
                        +
                    </span>

                    {/* Display value (no native input) */}
                    <div className="flex-1 min-w-0 flex items-end gap-0.5">
                        {displayValue ? (
                            <>
                                <span className="font-medium text-xd-16 text-[#1D1D1D] truncate">
                                    {displayValue}
                                </span>
                                {(keypadOpen || isFocused) && !isValidPhone && (
                                    <Image
                                        src={PhoneCursor}
                                        alt=""
                                        className="animate-blink mb-0.75 shrink-0"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {keypadOpen || isFocused ? (
                                    <Image
                                        src={PhoneCursor}
                                        alt=""
                                        className="absolute top-10 font-light text-[#1D1D1D] animate-blink mb-0.75 shrink-0"
                                    />
                                ) : (
                                    <Image
                                        src={PhoneCursor}
                                        alt=""
                                        className="absolute top-10 animate-blink mb-0.75 shrink-0 opacity-0!"
                                    />
                                )}
                                <span className="pl-1.5 text-xd-16 text-[#C3C3C3]">
                                    {placeholder}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Send arrow button — shows when valid */}
                    {isValidPhone && onSend && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSend();
                            }}
                            disabled={isLoading}
                            className="shrink-0 w-xd-28 h-xd-28 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t.common.accessibility.sendPhoneNumber}
                        >
                            <Image
                                src={ArrowRight}
                                alt="send"
                                className="size-xd-20 object-contain"
                            />
                        </button>
                    )}
                </div>

                {/* Always mounted: a live region has to exist before text is
                    put into it. That is load-bearing rather than tidy here —
                    on touch there is no focusable input at all, so this is the
                    only channel an error has. */}
                <p
                    id={ERROR_MESSAGE_ID}
                    role="status"
                    aria-live="polite"
                    dir="auto"
                    className="absolute inset-x-0 top-full ps-xd-16 pt-xd-4 text-xd-12 leading-xd-14 font-medium text-[#B3261E]"
                >
                    {errorMessage}
                </p>
            </div>

            {/* Custom keypad (touch devices) or hidden native input (desktop) */}
            {showCustomKeypad ? (
                <NumericKeypad
                    open={keypadOpen && !isLoading}
                    onPress={handleKeypadPress}
                    onBackspace={handleKeypadBackspace}
                    disabled={isLoading}
                    keypadRef={keypadRef}
                />
            ) : (
                <input
                    ref={hiddenInputRef}
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                    className="sr-only"
                    value={digits}
                    disabled={isLoading}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && isValidPhone && onSend) onSend();
                    }}
                    aria-invalid={errorMessage ? true : undefined}
                    aria-describedby={errorMessage ? ERROR_MESSAGE_ID : undefined}
                    onChange={(e) => {
                        // Normalise before anything else, then refuse what is
                        // too long rather than cutting it down. Truncating a
                        // paste is how `+9639942775331234` used to turn into a
                        // valid number belonging to somebody else — the same
                        // "many inputs, one number" fault this file is fixing,
                        // with a stranger receiving the OTP.
                        const next = normalizePhoneDigits(e.target.value);
                        if (next.length > E164_MAX_DIGITS) return;
                        setShowedLeadingZero(false);
                        onChange(next);
                    }}
                />
            )}
        </div>
    );
}
