import React, { useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';
import type { FieldError } from './field-error';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelClassName?: string;
    reviewMode?: boolean;
    hideRequired?: boolean;
    suffix?: string;
    error?: FieldError;
    className?: string;
    containerClassName?: string;
    description?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
    label,
    labelClassName,
    reviewMode = false,
    hideRequired = false,
    suffix,
    error,
    className = '',
    containerClassName = '',
    description,
    ...props
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { required } = props;
    const { t } = useTranslation();
    const valueStr = String(props.value ?? props.defaultValue ?? '');
    const hasError = !!error;
    const borderColor = hasError
        ? error!.type === 'warn'
            ? 'border-amber-400'
            : 'border-red-400'
        : 'border-[#d3d3d35e]';
    const msgColor = error?.type === 'warn' ? 'text-amber-500' : 'text-red-500';

    return (
        <div
            className={`flex p-xd-8 flex-col gap-xd-4 rounded-xd-15 w-94 cursor-text ${containerClassName}
            ${props.disabled ? 'bg-[#FCFCFC] border-none' : `bg-[#FFFFFF] border ${borderColor}`}`}
            onClick={() => inputRef.current?.focus()}
        >
            {label && (
                <span className={`text-xd-11 text-[#8D8D8D] font-medium ${labelClassName || ''}`}>
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
            <div className={`flex items-center gap-xd-4 ${suffix ? 'w-fit' : 'w-full'}`}>
                {reviewMode ? (
                    <p
                        className={`min-w-0 text-xd-13 font-medium text-text bg-transparent break-all ${suffix ? '' : 'w-full'} ${className}`}
                    >
                        {valueStr}
                    </p>
                ) : (
                    <input
                        ref={inputRef}
                        style={suffix ? { width: `${Math.max(1, valueStr.length)}ch` } : undefined}
                        disabled={props.disabled}
                        readOnly={props.readOnly}
                        className={`min-w-0 text-xd-13 font-medium text-text hover:outline-0 focus:outline-0 focus:ring-0 focus:border-0 bg-transparent ${suffix ? '' : 'w-full'} ${className}`}
                        {...props}
                    />
                )}
                {suffix && (
                    <span className="text-xd-13 font-medium text-text shrink-0">{suffix}</span>
                )}
            </div>
            {description && description}
            {false && <p className={`text-xd-11 font-medium ${msgColor}`}>{error!.message}</p>}{' '}
            {/* {hasError */}
        </div>
    );
};

export default Input;
