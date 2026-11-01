'use client';

import React from 'react';

interface DetailRowProps {
    label: string;
    value: string;
    icon?: React.ReactNode;
    valueColor?: string;
    bold?: boolean;
    bg?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, valueColor, bold, bg }) => {
    return (
        // Inline padding only when the row is a filled pill: text sitting flush
        // against a tinted, rounded edge reads as a layout bug. A transparent
        // row has no edge to clear, and padding it would push it out of line
        // with the unpilled blocks it sits beside on the receipt.
        <div
            className={`h-xd-54 rounded-xd-15 py-xd-8 ${bg ? 'px-xd-15' : ''}`}
            style={{ backgroundColor: bg || 'transparent' }}
        >
            <p className="text-xd-11 text-[#8D8D8D]">{label}</p>
            <div className="flex items-center gap-xd-6 mt-xd-4">
                {icon && <span className="shrink-0">{icon}</span>}
                <p
                    className={`text-xd-13 ${bold ? 'font-bold' : ''}`}
                    style={{ color: valueColor || '#1D1D1D' }}
                >
                    {value}
                </p>
            </div>
        </div>
    );
};

export default DetailRow;
