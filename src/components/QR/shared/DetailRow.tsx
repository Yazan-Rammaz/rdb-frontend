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
        <div
            className={`h-xd-54 rounded-xd-15 py-xd-8`}
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
