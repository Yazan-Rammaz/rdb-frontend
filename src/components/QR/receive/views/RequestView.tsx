'use client';

import React from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useTranslation } from '@/context/I18nContext';
import { AccountInfo } from '../AccountInfo';
import { NoteField } from './NoteField';
import type { FieldError } from '@/components/ui/field-error';
import type { FormData, SelectOption } from '../types';

export interface RequestViewProps {
    purposes: SelectOption[];
    validities: SelectOption[];
    formData: FormData;
    updateField: (field: keyof FormData, value: string) => void;
    mode: 'address' | 'request';
    errors?: {
        amount?: FieldError;
        purpose?: FieldError;
        validity?: FieldError;
    };
    onFieldTouch?: (field: string) => void;
    onGenerate: () => void;
    onCancel: () => void;
}

export function RequestView({
    purposes,
    validities,
    formData,
    updateField,
    mode,
    errors = {},
    onFieldTouch,
}: RequestViewProps) {
    const { t } = useTranslation();

    return (
        <div className="w-full flex flex-col h-full overflow-hidden relative">
            <div className="w-full flex-1 overflow-y-auto pb-xd-80 transition-all duration-300">
                <div className="w-full">
                    <AccountInfo
                        updateField={updateField}
                        hideRequired={true}
                        accountName={formData.accountName}
                        accountNumber={formData.accountNumber}
                        currency={formData.currency}
                    />
                </div>
                {mode === 'request' && (
                    <div className="w-full flex flex-col gap-xd-8 pt-xd-8 px-xd-25">
                        <div className="flex gap-xd-5 w-full">
                            <Input
                                id="number-hide"
                                type="number"
                                required
                                label={t.home.qr.enterAmount}
                                value={formData.amount}
                                suffix={formData.currency}
                                error={errors.amount}
                                onChange={(e) => updateField('amount', e.target.value)}
                                onBlur={() => onFieldTouch?.('amount')}
                                containerClassName="flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0 shadow-[0_0_0_0.5px_#D3D3D3]"
                            />
                            <Input
                                label={t.home.qr.enterReference}
                                value={formData.reference}
                                onChange={(e) => updateField('reference', e.target.value)}
                                containerClassName="flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0 shadow-[0_0_0_0.5px_#D3D3D3]"
                            />
                        </div>
                        <div className="flex rounded-xd-15 pt-xd-10 px-xd-10 pb-xd-10 shadow-[0_0_0_0.5px_#D3D3D3] bg-white flex-col">
                            <Select
                                required
                                label={t.home.qr.selectPurpose}
                                options={purposes}
                                value={formData.purpose}
                                onChange={(value) => {
                                    updateField('purpose', value);
                                    onFieldTouch?.('purpose');
                                }}
                                variant="tag"
                                error={errors.purpose}
                                description={
                                    <NoteField
                                        value={formData.note}
                                        onChange={(val) => updateField('note', val)}
                                    />
                                }
                            />
                        </div>
                        <div className="flex rounded-xd-15 pt-xd-10 px-xd-12 pb-xd-15 shadow-[0_0_0_0.5px_#D3D3D3] bg-white flex-col">
                            <Select
                                label={t.home.qr.validUntil}
                                options={validities}
                                value={formData.validity}
                                onChange={(id) => {
                                    updateField('validity', id);
                                    onFieldTouch?.('validity');
                                }}
                                variant="tag"
                                error={errors.validity}
                                description={
                                    formData.validity !== 'Always' && (
                                        <p className="text-xd-11 leading-xd-16 font-normal text-[#1D1D1D] text-center">
                                            {t.home.qr.validityDescription}
                                        </p>
                                    )
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
