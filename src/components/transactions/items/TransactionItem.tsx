import React, { ReactNode } from 'react';
import Image from 'next/image';

interface TransactionItemProps {
    title: string;
    subtitle?: string;
    date: string;
    description: ReactNode;
    status: string;
    amount: string;
    currency: string;
    icon: any;
    arrowIcon: any;
    isNegative?: boolean;
    isSelected?: boolean;
    isFirst?: boolean;
    onClick?: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
    title,
    date,
    description,
    status,
    amount,
    currency,
    icon,
    arrowIcon,
    isNegative = false,
    isSelected = false,
    isFirst = false,
    onClick,
}) => {
    // overflow-hidden matters as much as the fixed height: a merchant payment's
    // description carries a transfer id and a refund's carries a reason, both
    // far longer than a row is wide. Without a clip they wrapped, outgrew
    // h-xd-50, and printed over the rows above and below.
    return (
        <div
            onClick={onClick}
            className={`w-full max-w-xd-420 shrink-0 flex items-center justify-between gap-xd-12 last:mb-0 overflow-hidden transition-all duration-200 cursor-pointer bg-[#FCFCFC] h-xd-50 px-xd-12 rounded-xd-15 ${isSelected ? 'shadow-[0_0_0_0.5px_#d3d3d35e]' : isFirst ? 'shadow-[0_0_0_0.5px_#D3D3D3]' : ''}`}
        >
            {/* min-w-0 lets this column shrink below its content width, which is
                what allows the truncation below to engage at all. */}
            <div className="flex items-center gap-xd-12 min-w-0 flex-1">
                {/* Icon Section */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative size-xd-16">
                        <Image src={icon} alt={title} fill className="object-contain" />
                    </div>
                    <div className="relative size-xd-14">
                        <Image src={arrowIcon} alt="arrow" fill className="object-contain" />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col items-start min-w-0 w-full">
                    <span className="font-medium text-[#1D1D1D] leading-tight text-xd-13 truncate max-w-full">
                        {title}
                    </span>
                    <div className="flex items-center gap-1 mt-1 min-w-0 w-full">
                        {/* The date always stays; the description is what gives way. */}
                        <span className="font-light text-[#A0A0A0] text-xd-11 shrink-0">{date}</span>
                        <span className="font-normal text-[#8D8D8D] text-xd-11 truncate min-w-0">
                            {description}
                        </span>
                    </div>
                </div>
            </div>

            {/* Amount Section — never compressed by a long description */}
            <div className="flex flex-col items-end shrink-0">
                <div className="flex items-baseline gap-1">
                    <span
                        className={`font-bold text-xd-13 ${isNegative ? 'text-[#8D8D8D]' : 'text-[#1D1D1D]'}`}
                    >
                        {isNegative ? '-' : ''}
                        {amount}
                    </span>
                    <span
                        className={`font-bold text-xd-13 ${isNegative ? 'text-[#8D8D8D]' : 'text-[#1D1D1D]'}`}
                    >
                        {currency}
                    </span>
                </div>
                <span className="font-normal text-[#1D1D1D] text-xd-11">{status}</span>
            </div>
        </div>
    );
};

export default TransactionItem;
