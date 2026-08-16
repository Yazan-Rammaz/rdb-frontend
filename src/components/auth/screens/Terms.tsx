'use client';

import Image from 'next/image';
import { RdbIcon } from '@/components/icons';
import { useTranslation } from '@/context/I18nContext';
import termsSvg from '@/assets/icons/auth/terms.svg';
import { FlexibleSpace } from '@/scaling';

interface TermsScreenProps {
    onAgree?: () => void;
    onLater?: () => void;
}
// all items hieght 662

export default function TermsScreen({ onAgree, onLater }: TermsScreenProps) {
    const { t } = useTranslation();
    return (
        <div className="w-full bg-white flex flex-col">
            <FlexibleSpace size={280} share={0.42} />
            {/* Section 1 — Logo (flex-1 so extra space goes here only) */}
            <div className="flex flex-col items-center justify-center">
                <RdbIcon className="w-xd-144 h-xd-104" />
            </div>
            <FlexibleSpace size={196} share={0.29} />
            {/* Section 2 — fixed layout, no flex-1, spacings preserved as-designed */}
            <div className="flex flex-col items-center px-xd-20">
                {/* Description */}
                <p className="text-xd-14 leading-[1.4] text-[#1D1D1D] text-center">
                    {t.auth.terms.toCreate}
                    <span className="font-bold">{t.auth.terms.rdb}</span>
                    {t.auth.terms.termsOfServices}
                </p>

                <FlexibleSpace size={50} share={0.07} />
                {/* Terms icon + label */}
                <div className="flex flex-col items-center">
                    <div className="w-xd-40 h-xd-40 flex items-center justify-center rounded-xd-10">
                        <Image
                            src={termsSvg}
                            alt="terms"
                            className="w-xd-25 h-xd-25 object-contain"
                        />
                    </div>
                    <span className="text-xd-14 text-[#388CFF]">{t.auth.terms.termsLabel}</span>
                </div>
                <FlexibleSpace size={50} share={0.07} />
                {/* Button */}
                <button
                    onClick={onAgree}
                    className="w-xd-390 m-1 h-xd-60 rounded-xd-20 border-dashed border border-[#5D5C5D]/50 bg-[#FAFAFA] text-[#3C3C3C] text-xd-16"
                >
                    {t.auth.terms.agreeButton}
                </button>
                {/* Later */}
                {/* Space below buttons — absorbs 20% of vertical compression */}
                <FlexibleSpace size={30} share={0.04} />
                <div className="text-center">
                    <button
                        onClick={onLater}
                        className="text-xd-14 text-[#4D84FF] transition-colors hover:opacity-70"
                    >
                        {t.auth.terms.later}
                    </button>
                </div>
            </div>
            {/* Space below buttons — absorbs 20% of vertical compression */}
            <FlexibleSpace size={30} share={0.04} />
        </div>
    );
}
