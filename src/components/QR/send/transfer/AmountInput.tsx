'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';

interface AmountInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidate: () => void;
    amountConfirmed: boolean;
    onEdit: () => void;
    error: string | null;
    isChecking: boolean;
    currency: string;
    disabled?: boolean;
    focusTrigger?: number;
}

const AmountInput: React.FC<AmountInputProps> = ({
    value,
    onChange,
    onValidate,
    amountConfirmed,
    onEdit,
    error,
    isChecking,
    currency,
    disabled,
    focusTrigger,
}) => {
    const { t } = useTranslation();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const onValidateRef = useRef(onValidate);
    const editBaseValueRef = useRef<string | null>(null);
    const prevConfirmedRef = useRef(amountConfirmed);

    // Keep onValidate ref fresh to avoid stale closures in setTimeout
    useEffect(() => {
        onValidateRef.current = onValidate;
    }, [onValidate]);

    // Focus input when switching from confirmed → editing (edit button pressed)
    useEffect(() => {
        if (prevConfirmedRef.current === true && amountConfirmed === false) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
        prevConfirmedRef.current = amountConfirmed;
    }, [amountConfirmed]);

    // 3-second debounce on value change
    useEffect(() => {
        if (amountConfirmed || disabled || !value.trim()) return;
        // Don't schedule if user just pressed edit and hasn't changed value yet
        if (editBaseValueRef.current !== null) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onValidateRef.current();
        }, 1000);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value, amountConfirmed, disabled]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && value.trim()) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            onValidateRef.current();
        }
    };

    const handleBlur = () => {
        editBaseValueRef.current = null; // blur always unlocks validation
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim()) onValidateRef.current();
    };

    const handleChange = (newValue: string) => {
        // If value changed from the edit snapshot, unlock validation
        if (editBaseValueRef.current !== null && newValue !== editBaseValueRef.current) {
            editBaseValueRef.current = null;
        }
        onChange(newValue);
    };

    const handleEdit = () => {
        editBaseValueRef.current = value; // block validation until value changes
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onEdit();
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    useEffect(() => {
        if (error && !amountConfirmed && !disabled) {
            inputRef.current?.focus();
        }
    }, [error, amountConfirmed, disabled]);

    useEffect(() => {
        if (focusTrigger && !disabled) {
            inputRef.current?.focus();
        }
    }, [focusTrigger]);

    // Locked/confirmed state
    if (amountConfirmed) {
        return (
            <div className="flex flex-col gap-xd-7 h-xd-54 rounded-xd-15 px-xd-12 py-xd-6 bg-[#F7F7F7] border-[#d3d3d35e]">
                <div className="flex items-center gap-xd-4 h-xd-15">
                    <button
                        onClick={handleEdit}
                        className="text-xd-11 text-[#388CFF] cursor-pointer font-medium underline"
                    >
                        {t.transfer.amountInput.edit}
                    </button>
                    <span className="text-xd-11 text-[#8D8D8D] font-medium">
                        {t.transfer.amountInput.title}
                    </span>
                </div>
                <p className="text-xd-13 font-medium pl-0.5 text-[#1D1D1D] h-xd-17">
                    <span className="text-xd-13 font-bold text-[#1D1D1D]">{value} </span> {currency}
                </p>
            </div>
        );
    }

    // Editable state
    return (
        <div className="flex flex-col gap-1">
            <div
                onClick={() => inputRef.current?.focus()}
                className={`relative flex flex-col w-full ${error ? 'min-h-xd-54' : 'h-xd-54'}  gap-xd-6 rounded-xd-15 px-xd-12 py-xd-6 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors ${error ? 'border-[#FF5F61]!' : ''}`}
            >
                <span className="text-xd-11 h-xd-15  text-[#8D8D8D] font-medium">
                    {t.transfer.amountInput.placeholder}
                </span>
                <div className="flex items-center h-xd-17 gap-xd-6 cursor-text">
                    <input
                        ref={inputRef}
                        id="number-hide"
                        type="text"
                        inputMode="numeric"
                        size={Math.max(value.length, 6)}
                        value={value}
                        onChange={(e) => {
                            const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
                            handleChange(onlyNumbers);
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={disabled}
                        placeholder="000,000"
                        className={`w-auto min-w-0 text-[13px] font-medium text-[#1D1D1D] hover:outline-0 focus:outline-0 focus:ring-0 bg-transparent  ${error ? 'caret-[#FF5F61]' : 'caret-[#388CFF]'} disabled:opacity-50`}
                    />
                    <span className="text-xd-13 font-medium text-[#1D1D1D] shrink-0">
                        {currency}
                    </span>
                    <div className="absolute right-xd-8 top-1/2 -translate-y-1/2 flex flex-col items-end justify-center gap-xd-4 shrink-0">
                        {isChecking && (
                            <div className="size-xd-16 border-2 border-gray-200 border-t-[#3C3C3C] rounded-full animate-spin shrink-0" />
                        )}
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 rounded-xd-12 px-xd-16 py-xd-10 mt-xd-4">
                        <p className="text-xd-11 text-red-500 font-medium text-center">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AmountInput;
