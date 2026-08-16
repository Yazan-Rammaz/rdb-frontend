'use client';

import React, { useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { FieldError } from './field-error';

export interface ChipSelectOption {
    id: string;
    label: string;
}

interface ChipSelectProps {
    label?: string;
    options?: ChipSelectOption[];
    value: string | undefined;
    onChange?: (value: string) => void;
    /** Pill style (rounded-full) vs tag style (rounded-xl). Defaults to 'tag' */
    variant?: 'pill' | 'tag';
    error?: FieldError;
    required?: boolean;
    hideRequired?: boolean;
    reviewMode?: boolean;
    disabled?: boolean;
    /** Shown inside the container after chips, only when a value is selected */
    description?: React.ReactNode;
    className?: string;
}

const Select: React.FC<ChipSelectProps> = ({
    label,
    options,
    value,
    onChange,
    variant = 'tag',
    error,
    required,
    hideRequired,
    reviewMode,
    disabled,
    description,
    className = '',
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    // Mouse drag to scroll
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const scrollStartLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        scrollStartLeft.current = scrollRef.current?.scrollLeft ?? 0;
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return;
        const delta = dragStartX.current - e.clientX;
        scrollRef.current.scrollLeft = scrollStartLeft.current + delta;
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    const radius = variant === 'pill' ? 'rounded-full' : 'rounded-xd-12';
    const hasError = !!error;
    const chipErrorBorder = hasError
        ? error!.type === 'warn'
            ? 'shadow-[0_0_0_0.5px_#FCD34D]'
            : 'shadow-[0_0_0_0.5px_#FCA5A5]'
        : '';
    const msgColor = error?.type === 'warn' ? 'text-amber-500' : 'text-red-500';

    const selectedOption = options?.find((o) => o.id === value);

    return (
        <div className={`flex gap-xd-8 flex-col ${className}`}>
            {label && (
                <span className="text-xd-11 leading-xd-16 text-[#8D8D8D] font-normal">
                    {label}
                    {hideRequired ||
                        (required && !reviewMode && (
                            <span className="text-red-500 ml-0.5 hidden">*</span>
                        ))}
                    {hideRequired ||
                        (!required && !reviewMode && (
                            <span className="text-[#ADADAD] ml-1 hidden">
                                ({t.home.qr.optional})
                            </span>
                        ))}
                </span>
            )}

            <div className="flex flex-col gap-xd-12">
                {
                    <div
                        ref={scrollRef}
                        className="flex gap-xd-5 overflow-x-auto whitespace-nowrap scrollbar-hide select-none cursor-grab active:cursor-grabbing p-0.5"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    >
                        {options?.map((opt) => {
                            const isSelected = value === opt.id;
                            const selectedStyle =
                                variant === 'pill'
                                    ? 'bg-[#1d1d1d] text-white shadow-[0_0_0_0.5px_#1d1d1d]'
                                    : 'bg-[#FCFCFC] text-[#1D1D1D] shadow-[0_0_0_0.5px_#79affc]';
                            const unselectedStyle =
                                variant === 'pill'
                                    ? 'bg-white text-[#8D8D8D] shadow-[0_0_0_0.5px_#EEEEEE]'
                                    : 'bg-[#FFFFFF] text-[#1D1D1D] shadow-[0_0_0_0.5px_#D3D3D3]';

                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onChange?.(opt?.id)}
                                    className={`inline-flex shrink-0 items-center justify-center h-xd-30 px-xd-15 py-xd-8 text-xd-11 leading-xd-16 font-normal transition-colors ${radius} ${
                                        isSelected ? selectedStyle : unselectedStyle
                                    } ${hasError && !isSelected ? chipErrorBorder : ''}`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                }

                {description && description}
            </div>

            {hasError && (
                <p className={`text-xd-11 leading-xd-16 font-medium ${msgColor}`}>
                    {error!.message}
                </p>
            )}
        </div>
    );
};

export default Select;
