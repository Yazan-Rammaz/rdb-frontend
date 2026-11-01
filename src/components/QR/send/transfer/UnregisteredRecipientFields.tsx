'use client';

import React, { useRef, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import {
    NAME_MAX_LENGTH,
    nameIssue,
    nameIssueWhileTyping,
    normalizeName,
} from '@/lib/nameValidation';
import { idNumberIssue, normalizeIdNumber } from '@/lib/idNumberValidation';
import type { UnregisteredRecipient } from './types';

interface DetailFieldProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
> {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error: string | null;
}

/** Same shell as the recipient and amount fields: label above, value below. */
const DetailField: React.FC<DetailFieldProps> = ({ label, value, onChange, error, ...props }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            onClick={() => inputRef.current?.focus()}
            className={`flex flex-col w-full ${error ? 'min-h-xd-54' : 'h-xd-54'} gap-xd-6 rounded-xd-15 px-xd-12 py-xd-6 bg-white border border-[#d3d3d35e] focus-within:border-[#388CFF] transition-colors cursor-text ${error ? 'border-[#FF5F61]!' : ''}`}
        >
            <span className="text-xd-11 h-xd-15 text-[#8D8D8D] font-medium">{label}</span>
            <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                aria-label={label}
                aria-invalid={!!error}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full h-xd-17 min-w-0 text-xd-13 text-[#1D1D1D] hover:outline-0 focus:outline-0 focus:ring-0 bg-transparent placeholder:text-xd-13 placeholder:text-[#d3d3d35e] ${error ? 'caret-[#FF5F61]' : 'caret-[#388CFF]'} disabled:opacity-50`}
                {...props}
            />
            {error && (
                <div className="bg-red-50 rounded-xd-12 px-xd-16 py-xd-10 mt-xd-4">
                    <p className="text-xd-11 text-red-500 font-medium text-center">{error}</p>
                </div>
            )}
        </div>
    );
};

interface UnregisteredRecipientFieldsProps {
    value: UnregisteredRecipient;
    onChange: (value: UnregisteredRecipient) => void;
    disabled?: boolean;
}

/**
 * Who the money is for when the phone number has no account: the name and ID
 * number exactly as they appear on the document the recipient will present.
 */
const UnregisteredRecipientFields: React.FC<UnregisteredRecipientFieldsProps> = ({
    value,
    onChange,
    disabled,
}) => {
    const { t } = useTranslation();
    // Length rules wait for blur — a half-typed value is not a mistake.
    const [touched, setTouched] = useState({ fullName: false, idNumber: false });

    const fullNameError = (): string | null => {
        const nameErrors = t.auth.enterName.errors;
        if (nameIssueWhileTyping(value.fullName) === 'invalid-chars') {
            return nameErrors.invalidChars;
        }
        if (!touched.fullName) return null;
        switch (nameIssue(value.fullName)) {
            case 'empty':
                return null;
            case 'invalid-chars':
                return nameErrors.invalidChars;
            case 'too-short':
                return nameErrors.tooShort;
            case 'too-long':
                return nameErrors.tooLong;
            default:
                // A valid name, but the field asks for name *and* surname.
                return normalizeName(value.fullName).includes(' ')
                    ? null
                    : t.transfer.recipient.errors.nameNeedsSurname;
        }
    };

    const idNumberError = (): string | null => {
        const issue = idNumberIssue(value.idNumber);
        if (issue === 'too-long') return t.transfer.recipient.errors.idTooLong;
        if (issue === 'too-short' && touched.idNumber) {
            return t.transfer.recipient.errors.idTooShort;
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-xd-4">
            <DetailField
                label={t.transfer.recipient.fullName}
                placeholder={t.transfer.recipient.fullNamePlaceholder}
                value={value.fullName}
                onChange={(fullName) => onChange({ ...value, fullName })}
                onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                error={fullNameError()}
                maxLength={NAME_MAX_LENGTH}
                disabled={disabled}
            />
            <DetailField
                label={t.transfer.recipient.idNumber}
                placeholder={t.transfer.recipient.idNumberPlaceholder}
                value={value.idNumber}
                onChange={(idNumber) =>
                    onChange({ ...value, idNumber: normalizeIdNumber(idNumber) })
                }
                onBlur={() => setTouched((prev) => ({ ...prev, idNumber: true }))}
                error={idNumberError()}
                autoCapitalize="characters"
                disabled={disabled}
            />
        </div>
    );
};

export default UnregisteredRecipientFields;
