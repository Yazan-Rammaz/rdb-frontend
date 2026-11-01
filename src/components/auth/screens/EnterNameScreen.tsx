'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FlexibleSpace } from '@/scaling';
import ArrowRight from '@/assets/icons/auth/arrow-right.svg';

interface EnterNameScreenProps {
    onSubmit: (name: string) => void | Promise<void>;
    loading?: boolean;
}

export default function EnterNameScreen({ onSubmit, loading }: EnterNameScreenProps) {
    const [name, setName] = useState('');

    const handleSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed || loading) return;
        onSubmit(trimmed);
    };

    const canSubmit = name.trim().length > 0;

    return (
        <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#F4FFF4' }}>
            <FlexibleSpace grow share={0.45} />

            {/* Title block */}
            <div className="px-xd-30 flex flex-col items-start">
                <h2 className="text-xd-30 font-bold text-[#1D1D1D]">Enter Your Name !</h2>
                <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-8">
                    Last Step And Enjoy Our Services
                </p>
                <p className="text-xd-12 font-normal text-[#1D1D1D] mt-xd-4">
                    Ensure Greater Security And Protect Your Funds
                </p>
            </div>

            <FlexibleSpace size={60} share={0} />

            {/* Input row */}
            <div className="px-xd-15">
                <div className="relative flex items-center w-full h-xd-60 rounded-xd-20 border border-dashed border-[#C3C3C3] focus-within:border-[#388CFF] px-xd-16 transition-colors">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Enter Your Name Exact ID"
                        autoFocus
                        className="flex-1 bg-transparent outline-none text-xd-16 font-medium text-[#1D1D1D] placeholder:text-[#1D1D1D]/40 caret-[#1D1D1D] [caret-shape:underscore]"
                    />
                    {canSubmit && (
                        <button
                            onClick={handleSubmit}
                            disabled={!!loading}
                            className="shrink-0 flex items-center justify-center disabled:opacity-50"
                            aria-label="Continue"
                        >
                            <Image
                                src={ArrowRight}
                                alt="continue"
                                width={20}
                                height={20}
                                className="object-contain"
                            />
                        </button>
                    )}
                </div>
            </div>

            <FlexibleSpace grow share={0.55} />
        </div>
    );
}
