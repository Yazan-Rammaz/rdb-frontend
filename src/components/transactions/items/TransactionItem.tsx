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
    return (
        <div
            onClick={onClick}
            className={`w-full max-w-xd-420 shrink-0 flex items-center justify-between last:mb-0 transition-all duration-200 cursor-pointer bg-[#FCFCFC] h-xd-50 px-xd-12 rounded-xd-15 ${isSelected ? 'shadow-[0_0_0_0.5px_#d3d3d35e]' : isFirst ? 'shadow-[0_0_0_0.5px_#D3D3D3]' : ''}`}
        >
            <div className="flex items-center gap-xd-12">
                {/* Icon Section */}
                <div className="flex flex-col items-center gap-1">
                    <div className="relative size-xd-16">
                        <Image src={icon} alt={title} fill className="object-contain" />
                    </div>
                    <div className="relative size-xd-14">
                        <Image src={arrowIcon} alt="arrow" fill className="object-contain" />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col items-start">
                    <span className="font-medium text-[#1D1D1D] leading-tight text-xd-13">
                        {title}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="font-light text-[#A0A0A0] text-xd-11">{date}</span>
                        <span className="font-normal text-[#8D8D8D] text-xd-11">{description}</span>
                    </div>
                </div>
            </div>

            {/* Amount Section */}
            <div className="flex flex-col items-end">
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
