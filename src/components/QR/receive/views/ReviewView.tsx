'use client';

import React from 'react';
import { AccountInfo } from '../AccountInfo';
import { ReadOnlyFields } from './ReadOnlyFields';
import type { FormData, SelectOption } from '../types';
import { useTranslation } from '@/context/I18nContext';

interface ReviewViewProps {
    purposes: SelectOption[];
    validities: SelectOption[];
    formData: FormData;
    showName: boolean;
    updateField: (field: keyof FormData, value: string) => void;
    expiresAt?: string | null;
    isPermanent?: boolean;
    onExpired?: () => void;
}

export function ReviewView({
    formData,
    purposes,
    validities,
    updateField,
    expiresAt,
    isPermanent,
    onExpired,
}: ReviewViewProps) {
    const isExpired = !isPermanent && expiresAt ? new Date(expiresAt) < new Date() : false;

    const { t } = useTranslation();
    return (
        <div className="w-full flex flex-col h-full overflow-hidden relative">
            <div
                className={`w-full flex-1 ${isExpired ? 'pb-0' : 'pb-xd-80'} overflow-y-auto transition-all duration-300`}
            >
                <div className="w-full">
                    <AccountInfo
                        updateField={updateField}
                        hideRequired={true}
                        reviewMode={true}
                        accountName={formData.accountName}
                        accountNumber={formData.accountNumber}
                        currency={formData.currency}
                    />
                </div>
                <ReadOnlyFields
                    formData={formData}
                    purposes={purposes}
                    validities={validities}
                    expiresAt={expiresAt}
                    isPermanent={isPermanent}
                    onExpired={onExpired}
                />

                {isExpired && (
                    <div className="flex items-center justify-center px-6 py-4">
                        <button
                            disabled
                            className="text-center flex items-center justify-center h-7.5 w-full max-w-[320px] py-3 rounded-xl text-[#FFFFFF] bg-[#FF5F60] text-[11px] font-medium cursor-not-allowed"
                        >
                            {t.transfer.deposit.expiredButton}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
