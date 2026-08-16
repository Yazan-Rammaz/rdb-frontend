import React from 'react';
import Input from '@/components/ui/Input';
import { useTranslation } from '@/context/I18nContext';
import { NoteField } from './NoteField';
import CountdownTimer from '../../send/payment-request/CountdownTimer';
import { buildValidityLabel, getPurposeLabel } from '../utils';
import type { FormData, SelectOption } from '../types';

interface ReadOnlyFieldsProps {
    formData: FormData;
    purposes: SelectOption[];
    validities: SelectOption[];
    hideRequired?: boolean;
    expiresAt?: string | null;
    isPermanent?: boolean;
    onExpired?: () => void;
}

export function ReadOnlyFields({
    formData,
    purposes,
    validities,
    hideRequired = true,
    expiresAt,
    isPermanent,
    onExpired,
}: ReadOnlyFieldsProps) {
    const { t } = useTranslation();
    const purposeLabel = getPurposeLabel(formData.purpose, purposes);
    const validityLabel = buildValidityLabel(formData.validity, validities);

    return (
        <div className="w-full flex flex-col gap-xd-8 pt-xd-8 px-xd-25">
            <div className="flex gap-xd-5 w-full">
                <Input
                    hideRequired={hideRequired}
                    reviewMode={true}
                    id="number-hide"
                    type="number"
                    required
                    disabled
                    label={t.home.qr.enterAmount}
                    value={formData.amount}
                    suffix={formData.currency}
                    containerClassName={`flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0`}
                />
                {formData.reference && (
                    <Input
                        hideRequired={hideRequired}
                        reviewMode={true}
                        label={t.home.qr.enterReference}
                        value={formData.reference}
                        disabled
                        containerClassName="flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0"
                    />
                )}
            </div>

            <div className="flex gap-xd-5 w-full">
                <Input
                    hideRequired={hideRequired}
                    reviewMode={true}
                    label={t.home.qr.selectPurpose}
                    value={purposeLabel}
                    disabled
                    className="text-xd-11"
                    containerClassName="flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0"
                />
                <Input
                    hideRequired={hideRequired}
                    reviewMode={true}
                    label={t.home.qr.type}
                    value={t.home.qr.paymentRequest}
                    disabled
                    className="text-xd-11"
                    containerClassName="flex-1 h-xd-54 !py-0 justify-center px-xd-12 !border-0"
                />
            </div>

            {formData.note && <NoteField value={formData.note} disabled />}

            {!isPermanent && expiresAt ? (
                <div className="px-xd-12 flex flex-col gap-xd-6">
                    <p className="text-xd-11 text-[#8D8D8D] font-medium">{t.home.qr.validUntil}</p>
                    <div className="h-xd-30 px-xd-12 shadow-[0_0_0_0.5px_#D3D3D3] rounded-xd-12 flex items-center">
                        <CountdownTimer
                            expiryTimestamp={expiresAt}
                            onExpired={onExpired ?? (() => {})}
                            hideLabel
                        />
                    </div>
                    <p className="text-center text-xd-11 font-normal text-[#1D1D1D] px-1">
                        {t.home.qr.validityDescription}
                    </p>
                </div>
            ) : (
                <div className="px-xd-12 flex flex-col gap-xd-6">
                    <p className="text-xd-11 text-[#8D8D8D] font-medium">{t.home.qr.validUntil}</p>
                    <div className="h-xd-30 px-xd-12 shadow-[0_0_0_0.5px_#D3D3D3] rounded-xd-12 flex items-center">
                        <span className="text-xd-11 text-[#1D1D1D]">{validityLabel}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
