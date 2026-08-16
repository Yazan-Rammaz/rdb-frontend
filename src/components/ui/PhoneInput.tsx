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

interface CountryData {
    code: string;
    flag: string;
    name: string;
    dialCode: string;
    maxLocal: number; // max local digits (excluding dial code)
}

const COUNTRIES: CountryData[] = [
    { code: 'SY', flag: '\u{1F1F8}\u{1F1FE}', name: 'Syria', dialCode: '963', maxLocal: 9 },
    { code: 'TR', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey', dialCode: '90', maxLocal: 10 },
    { code: 'IQ', flag: '\u{1F1EE}\u{1F1F6}', name: 'Iraq', dialCode: '964', maxLocal: 10 },
    { code: 'JO', flag: '\u{1F1EF}\u{1F1F4}', name: 'Jordan', dialCode: '962', maxLocal: 9 },
    { code: 'LB', flag: '\u{1F1F1}\u{1F1E7}', name: 'Lebanon', dialCode: '961', maxLocal: 8 },
    { code: 'SA', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia', dialCode: '966', maxLocal: 9 },
    { code: 'AE', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE', dialCode: '971', maxLocal: 9 },
    { code: 'EG', flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt', dialCode: '20', maxLocal: 10 },
    { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', dialCode: '1', maxLocal: 10 },
    {
        code: 'GB',
        flag: '\u{1F1EC}\u{1F1E7}',
        name: 'United Kingdom',
        dialCode: '44',
        maxLocal: 10,
    },
    { code: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', dialCode: '49', maxLocal: 11 },
    { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', name: 'France', dialCode: '33', maxLocal: 9 },
    { code: 'IT', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy', dialCode: '39', maxLocal: 10 },
    { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', dialCode: '34', maxLocal: 9 },
    { code: 'NL', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands', dialCode: '31', maxLocal: 9 },
    { code: 'SE', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden', dialCode: '46', maxLocal: 9 },
    { code: 'KW', flag: '\u{1F1F0}\u{1F1FC}', name: 'Kuwait', dialCode: '965', maxLocal: 8 },
    { code: 'QA', flag: '\u{1F1F6}\u{1F1E6}', name: 'Qatar', dialCode: '974', maxLocal: 8 },
    { code: 'BH', flag: '\u{1F1E7}\u{1F1ED}', name: 'Bahrain', dialCode: '973', maxLocal: 8 },
    { code: 'OM', flag: '\u{1F1F4}\u{1F1F2}', name: 'Oman', dialCode: '968', maxLocal: 8 },
    { code: 'PS', flag: '\u{1F1F5}\u{1F1F8}', name: 'Palestine', dialCode: '970', maxLocal: 9 },
    { code: 'YE', flag: '\u{1F1FE}\u{1F1EA}', name: 'Yemen', dialCode: '967', maxLocal: 9 },
    { code: 'LY', flag: '\u{1F1F1}\u{1F1FE}', name: 'Libya', dialCode: '218', maxLocal: 9 },
    { code: 'SD', flag: '\u{1F1F8}\u{1F1E9}', name: 'Sudan', dialCode: '249', maxLocal: 9 },
    { code: 'TN', flag: '\u{1F1F9}\u{1F1F3}', name: 'Tunisia', dialCode: '216', maxLocal: 8 },
    { code: 'DZ', flag: '\u{1F1E9}\u{1F1FF}', name: 'Algeria', dialCode: '213', maxLocal: 9 },
    { code: 'MA', flag: '\u{1F1F2}\u{1F1E6}', name: 'Morocco', dialCode: '212', maxLocal: 9 },
    { code: 'IN', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', dialCode: '91', maxLocal: 10 },
    { code: 'PK', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan', dialCode: '92', maxLocal: 10 },
    { code: 'BD', flag: '\u{1F1E7}\u{1F1E9}', name: 'Bangladesh', dialCode: '880', maxLocal: 10 },
    { code: 'CN', flag: '\u{1F1E8}\u{1F1F3}', name: 'China', dialCode: '86', maxLocal: 11 },
    { code: 'JP', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', dialCode: '81', maxLocal: 11 },
    { code: 'KR', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', dialCode: '82', maxLocal: 11 },
    { code: 'RU', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia', dialCode: '7', maxLocal: 10 },
    { code: 'BR', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', dialCode: '55', maxLocal: 11 },
    { code: 'MX', flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico', dialCode: '52', maxLocal: 10 },
    { code: 'CA', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', dialCode: '1', maxLocal: 10 },
    { code: 'AU', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', dialCode: '61', maxLocal: 9 },
];

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

const MIN_PHONE_DIGITS = 10;
const DEFAULT_MAX_TOTAL = 15;

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend?: () => void;
    isLoading?: boolean;
    placeholder?: string;
}

export const getCountryByDialCode = (input: string): CountryData | undefined => {
    const cleanInput = input.replace(/\D/g, '');
    return COUNTRIES.sort((a, b) => b.dialCode.length - a.dialCode.length).find((country) =>
        cleanInput.startsWith(country.dialCode),
    );
};

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

    const digits = value.replace(/[^\d]/g, '');

    const detectedCountry = useMemo(() => {
        if (!digits) return null;
        for (const country of SORTED_COUNTRIES) {
            if (digits.startsWith(country.dialCode)) return country;
        }
        return null;
    }, [digits]);

    const formatNumber = useCallback((d: string): string => {
        if (!d) return '';
        let matchedDialCode = '';
        for (const country of SORTED_COUNTRIES) {
            if (d.startsWith(country.dialCode)) {
                matchedDialCode = country.dialCode;
                break;
            }
        }
        if (matchedDialCode) {
            const rest = d.slice(matchedDialCode.length);
            const groups = rest.match(/.{1,3}/g) || [];
            return [matchedDialCode, ...groups].join(' ');
        }
        const groups = d.match(/.{1,3}/g) || [];
        return groups.join(' ');
    }, []);

    const displayValue = useMemo(() => formatNumber(digits), [digits, formatNumber]);

    const maxTotalDigits = useMemo(() => {
        if (!detectedCountry) return DEFAULT_MAX_TOTAL;
        return detectedCountry.dialCode.length + detectedCountry.maxLocal;
    }, [detectedCountry]);

    const isValidPhone = detectedCountry
        ? digits.length === maxTotalDigits
        : digits.length >= MIN_PHONE_DIGITS;

    const handleKeypadPress = useCallback(
        (digit: string) => {
            if (digits.length >= maxTotalDigits) return;
            onChange(digits + digit);
        },
        [digits, onChange, maxTotalDigits],
    );

    const handleKeypadBackspace = useCallback(() => {
        if (digits.length > 0) {
            onChange(digits.slice(0, -1));
        }
    }, [digits, onChange]);

    return (
        <div className="flex flex-col w-full items-center">
            {/* Input display */}
            <div className="flex w-full items-center justify-center">
                <div
                    ref={inputRef}
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
                    onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, maxTotalDigits);
                        onChange(d);
                    }}
                />
            )}
        </div>
    );
}
