import React from 'react';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import PinIcon from '@/assets/icons/home/qr/pin.svg';
import { useTranslation } from '@/context/I18nContext';

interface NoteFieldProps {
    value: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
}

export function NoteField({ value, onChange, disabled }: NoteFieldProps) {
    const { t } = useTranslation();

    return (
        <div className="relative">
            <Input
                containerClassName="!border-0 !shadow-none !bg-transparent !p-0 !rounded-none"
                placeholder={t.home.qr.note}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                disabled={disabled}
                className="text-xd-13! ml-5 leading-xd-16! font-light!! ps-xd-6! placeholder:text-[#D3D3D3]! text-[#1D1D1D]!"
            />
            <div
                className={`absolute inset-s-0 top-1/2 -translate-y-1/2 ${value ? 'opacity-100' : 'opacity-40'}`}
            >
                <Image src={PinIcon} alt="note" width={16} height={16} className="size-xd-16" />
            </div>
        </div>
    );
}
