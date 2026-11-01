'use client';

import React, { useEffect, useRef } from 'react';
import type { RecipientAccountDetails } from '@/core/types/transfer';
import Image from 'next/image';
import ScanIcon from '@/assets/icons/home/transfer/qrscaninput.svg';
import QrInputMethodIcon from '@/assets/icons/home/transfer/qrinputmethod.svg';
import PhoneIcon from '@/assets/icons/home/transfer/phone.svg';
import InfoIcon from '@/assets/icons/home/transfer/info.svg';
import CloseIcon from '@/assets/icons/home/transfer/close.svg';
import { useTranslation } from '@/context/I18nContext';

interface RecipientInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidate: () => void;
    recipientDetails: RecipientAccountDetails | null;
    isValidating: boolean;
    error: string | null;
    currencyWarning: string | null;
    accountConfirmed: boolean;
    onEdit: () => void;
    inputMode: 'account' | 'phone';
    onModeChange: (mode: 'account' | 'phone') => void;
    editingAfterConfirm: boolean;
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
    accountConfirmed,
    onEdit,
    inputMode,
    onModeChange,
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

        if (inputMode !== 'account') {
            onChange(nextValue);
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

    // Editable state
    return (
        <div className="flex  flex-col gap-1">
            <div
                onClick={() => inputRef.current?.focus()}
                className={`flex flex-col w-full  ${error ? 'min-h-xd-54' : 'h-xd-54'} rounded-xd-15 px-xd-12 py-xd-6 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors ${error ? 'border-[#FF5F61]!' : ''} ${currencyWarning && !error ? 'border-amber-300!' : ''}`}
            >
                {/* Top row: label + input + actions */}
                <div className="flex flex-row items-center gap-xd-8">
                    {/* Left: label + input stacked */}
                    <div className="flex flex-col gap-xd-6 pb-xd-1 flex-1 min-w-0">
                        {/* Label row with mode toggle */}
                        <div className="flex items-center gap-xd-4 h-xd-15 flex-wrap">
                            <span
                                className={`text-xd-11 font-medium transition-colors shrink-0 ${inputMode === 'account' ? 'text-[#1D1D1D]' : 'text-[#d3d3d35e] cursor-pointer underline'}`}
                            >
                                {t.transfer.recipient.enter}
                            </span>
                            <button
                                onClick={() => onModeChange('account')}
                                className={`text-xd-11 font-medium transition-colors shrink-0 ${inputMode === 'account' ? 'text-[#1D1D1D]' : 'text-[#d3d3d35e] cursor-pointer underline'}`}
                            >
                                {t.transfer.recipient.recipientAccount}
                            </button>
                            <span className="text-xd-11 text-[#8D8D8D] font-medium shrink-0">
                                {t.transfer.recipient.or}
                            </span>
                            {/* Phone icon */}
                            <Image
                                width={14}
                                height={14}
                                src={PhoneIcon}
                                alt="Phone Input"
                                className="size-xd-14 shrink-0"
                            />
                            <button
                                onClick={() => onModeChange('phone')}
                                className={`text-xd-11 font-medium transition-colors shrink-0 ${inputMode === 'phone' ? 'text-[#388CFF]' : 'text-[#d3d3d35e] cursor-pointer underline'}`}
                            >
                                {t.transfer.recipient.phoneNumber}
                            </button>
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
                        <div className="flex items-center gap-xd-4 pb-xd-2">
                            {inputMode === 'phone' && (
                                <span className="text-xd-13 font-medium text-[#1D1D1D]">+</span>
                            )}
                            <input
                                ref={inputRef}
                                inputMode="numeric"
                                type={inputMode === 'phone' ? 'tel' : 'text'}
                                value={value}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={disabled}
                                placeholder={
                                    inputMode === 'phone'
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
                            inputMode === 'account' && (
                                <div className="flex items-center gap-xd-12">
                                    {onPaste && (
                                        <button
                                            onClick={onPaste}
                                            className="cursor-pointer text-xd-11 underline text-[#388CFF] font-medium"
                                        >
                                            {t.transfer.recipient.paste}
                                        </button>
                                    )}
                                    {onScanQR && (
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
                            )
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
            </div>
        </div>
    );
};

export default RecipientInput;
