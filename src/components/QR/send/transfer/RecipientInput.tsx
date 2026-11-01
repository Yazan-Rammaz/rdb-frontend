'use client';

import React, { useEffect, useRef } from 'react';
import type { RecipientAccountDetails } from '@/core/types/transfer';
import Image from 'next/image';
import ScanIcon from '@/assets/icons/home/transfer/qrscaninput.svg';
import QrInputMethodIcon from '@/assets/icons/home/transfer/qrinputmethod.svg';
import InfoIcon from '@/assets/icons/home/transfer/info.svg';
import CloseIcon from '@/assets/icons/home/transfer/close.svg';
import { useTranslation } from '@/context/I18nContext';
import { E164_MAX_DIGITS, normalizePhoneDigits } from '@/lib/phoneValidation';
import type { RecipientInputMode } from './types';

interface RecipientInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidate: () => void;
    recipientDetails: RecipientAccountDetails | null;
    isValidating: boolean;
    error: string | null;
    currencyWarning: string | null;
    /** A neutral note under the field — not an error, the value stands. */
    notice?: string | null;
    accountConfirmed: boolean;
    onEdit: () => void;
    inputMode: RecipientInputMode;
    onPaste?: () => void;
    onScanQR?: () => void;
    inputMethod?: 'MANUAL' | 'QR';
    disabled?: boolean;
}

const RecipientInput: React.FC<RecipientInputProps> = ({
    value,
    onChange,
    onValidate,
    recipientDetails,
    isValidating,
    error,
    currencyWarning,
    notice,
    accountConfirmed,
    onEdit,
    inputMode,
    onPaste,
    onScanQR,
    inputMethod,
    disabled,
}) => {
    const { t, rtl } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const shouldFocusAfterEditRef = useRef(false);

    useEffect(() => {
        if (error && !accountConfirmed && !disabled) {
            inputRef.current?.focus();
        }
    }, [error, accountConfirmed, disabled]);

    useEffect(() => {
        if (!accountConfirmed && shouldFocusAfterEditRef.current && !disabled) {
            const frameId = window.requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
            shouldFocusAfterEditRef.current = false;
            return () => window.cancelAnimationFrame(frameId);
        }
    }, [accountConfirmed, disabled]);

    const handleEditClick = () => {
        shouldFocusAfterEditRef.current = true;
        onEdit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (inputMode === 'account') {
            const start = e.currentTarget.selectionStart ?? 0;
            const end = e.currentTarget.selectionEnd ?? 0;
            const isCollapsed = start === end;

            // Backspace from end of xxxx- should remove '-' and the last digit together.
            if (
                e.key === 'Backspace' &&
                isCollapsed &&
                value.endsWith('-') &&
                start === value.length
            ) {
                e.preventDefault();
                onChange(value.slice(0, -2));
                return;
            }

            // Backspace when caret is just after '-' removes '-' first.
            if (e.key === 'Backspace' && isCollapsed && start > 0 && value[start - 1] === '-') {
                e.preventDefault();
                onChange(`${value.slice(0, start - 1)}${value.slice(start)}`);
                return;
            }

            // Delete when caret is just before '-' removes '-' first.
            if (e.key === 'Delete' && isCollapsed && value[start] === '-') {
                e.preventDefault();
                onChange(`${value.slice(0, start)}${value.slice(start + 1)}`);
                return;
            }
        }

        if (e.key === 'Enter') {
            onValidate();
        }
    };

    const formatAccountForTyping = (rawValue: string) => {
        const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 8);
        if (digitsOnly.length < 4) return digitsOnly;
        if (digitsOnly.length === 4) return `${digitsOnly}-`;
        return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = e.target.value;

        if (inputMode === 'phone') {
            const digits = normalizePhoneDigits(nextValue);
            // Refused, not truncated: a number cut to fit is someone else's.
            if (digits.length <= E164_MAX_DIGITS) onChange(digits);
            return;
        }

        const nativeInputEvent = e.nativeEvent as InputEvent;
        const isPaste = nativeInputEvent.inputType === 'insertFromPaste';
        const isDelete = nativeInputEvent.inputType?.startsWith('delete');

        // Keep pasted value as-is so strict format validation can reject invalid formats.
        if (isPaste) {
            onChange(nextValue);
            return;
        }

        // Allow user to remove the trailing dash (xxxx- -> xxxx) while deleting.
        if (isDelete && /^\d{4}$/.test(nextValue)) {
            onChange(nextValue);
            return;
        }

        onChange(formatAccountForTyping(nextValue));
    };

    const handleClear = () => {
        onChange('');
    };

    // Locked/confirmed state
    if (accountConfirmed && recipientDetails) {
        return (
            <div className="flex flex-col w-xd-370 h-xd-54 gap-xd-8 rounded-xd-15 px-xd-12 py-xd-6 bg-[#F7F7F7]">
                <div className="flex items-center gap-xd-4 h-xd-15">
                    <button
                        onClick={handleEditClick}
                        className="cursor-pointer underline text-xd-11 text-[#388CFF] font-medium"
                    >
                        {t.transfer.recipient.edit}
                    </button>
                    <span className="text-xd-11 text-[#8D8D8D] font-medium">
                        {t.transfer.recipient.recipientAccountNumber}
                    </span>
                    {/* Info icon */}
                    <Image
                        width={14}
                        height={14}
                        src={InfoIcon}
                        alt="Info"
                        className="size-xd-14"
                    />
                </div>
                <div className="flex items-center gap-xd-4 h-xd-17">
                    {inputMethod === 'QR' && (
                        <Image
                            src={QrInputMethodIcon}
                            alt="QR Input"
                            width={14}
                            height={14}
                            className="size-xd-14 object-contain shrink-0"
                        />
                    )}
                    <p className="text-xd-13 text-[#1D1D1D]">
                        {recipientDetails.accountNumber} {recipientDetails.maskedName}
                    </p>
                </div>
            </div>
        );
    }

    const isPhone = inputMode === 'phone';
    const hasMessage = !!(error || currencyWarning || notice);

    // Editable state
    return (
        <div className="flex  flex-col gap-1">
            <div
                onClick={() => inputRef.current?.focus()}
                className={`flex flex-col w-full  ${hasMessage ? 'min-h-xd-54' : 'h-xd-54'} rounded-xd-15 px-xd-12 py-xd-6 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors ${error ? 'border-[#FF5F61]!' : ''} ${currencyWarning && !error ? 'border-amber-300!' : ''}`}
            >
                {/* Top row: label + input + actions */}
                <div className="flex flex-row items-center gap-xd-8">
                    {/* Left: label + input stacked */}
                    <div className="flex flex-col gap-xd-6 pb-xd-1 flex-1 min-w-0">
                        {/* Label row */}
                        <div className="flex items-center gap-xd-4 h-xd-15">
                            <span className="text-xd-11 text-[#8D8D8D] font-medium truncate">
                                {isPhone
                                    ? t.transfer.recipient.recipientPhoneNumber
                                    : t.transfer.recipient.recipientAccountNumber}
                            </span>
                            {/* Info icon */}
                            <Image
                                width={14}
                                height={14}
                                src={InfoIcon}
                                alt="Info"
                                className="size-xd-14 shrink-0"
                            />
                        </div>
                        {/* Input row */}
                        {/* A phone number reads left-to-right in every language. */}
                        <div
                            dir={isPhone ? 'ltr' : undefined}
                            className="flex items-center gap-xd-4 pb-xd-2"
                        >
                            {isPhone && (
                                <span className="text-xd-13 font-medium text-[#1D1D1D]">+</span>
                            )}
                            <input
                                ref={inputRef}
                                inputMode="numeric"
                                type={isPhone ? 'tel' : 'text'}
                                autoComplete="off"
                                value={value}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={disabled}
                                placeholder={
                                    isPhone
                                        ? t.transfer.recipient.placeholderPhone
                                        : t.transfer.recipient.placeholderAccount
                                }
                                className={`flex-1 h-xd-17 min-w-0 text-xd-13 text-[#1D1D1D] hover:outline-0 focus:outline-0 focus:ring-0 bg-transparent placeholder:text-xd-13 placeholder:text-light placeholder:text-[#d3d3d35e] ${error ? 'caret-[#FF5F61]' : 'caret-[#388CFF]'} disabled:opacity-50`}
                            />
                        </div>
                    </div>
                    {/* Right: actions — vertically centered */}
                    <div className="flex items-center justify-center shrink-0 self-stretch">
                        {isValidating ? (
                            <div className="size-xd-16 border-2 border-gray-200 border-t-[#3C3C3C] rounded-full animate-spin" />
                        ) : !value ? (
                            <div className="flex items-center gap-xd-12">
                                {onPaste && (
                                    <button
                                        onClick={onPaste}
                                        className="cursor-pointer text-xd-11 underline text-[#388CFF] font-medium"
                                    >
                                        {t.transfer.recipient.paste}
                                    </button>
                                )}
                                {/* A QR carries an account number, never a phone. */}
                                {!isPhone && onScanQR && (
                                    <button
                                        onClick={onScanQR}
                                        className="cursor-pointer text-[#8D8D8D] hover:text-[#1D1D1D] transition-colors flex items-center justify-center"
                                        aria-label={t.common.accessibility.scanQrCode}
                                    >
                                        <Image
                                            width={14}
                                            height={14}
                                            src={ScanIcon}
                                            alt={'scan qr'}
                                            className="size-xd-14 object-contain"
                                        />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleClear}
                                className="text-[#8D8D8D] hover:text-[#1D1D1D] transition-colors size-xd-20 flex items-center justify-center"
                                aria-label={t.common.accessibility.clearInput}
                            >
                                <Image
                                    width={14}
                                    height={14}
                                    src={CloseIcon}
                                    alt={'clear input'}
                                    className="size-xd-16 object-contain"
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error message — inside container */}
                {error && (
                    <div className="bg-red-50 rounded-xd-12 px-xd-16 py-xd-10 mt-xd-4">
                        <p className="text-xd-11 text-red-500 font-medium text-center">{error}</p>
                    </div>
                )}

                {/* Currency mismatch warning — inside container */}
                {currencyWarning && !error && (
                    <div className="bg-amber-50 rounded-xd-12 px-xd-16 py-xd-10 mt-xd-4">
                        <p className="text-xd-11 text-amber-600 font-medium text-center">
                            {currencyWarning}
                        </p>
                    </div>
                )}

                {/* Notice — inside container */}
                {notice && !error && !currencyWarning && (
                    <div className="bg-[#F7F7F7] rounded-xd-12 px-xd-16 py-xd-10 mt-xd-4">
                        <p className="text-xd-11 text-[#8D8D8D] font-medium text-center">
                            {notice}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipientInput;
