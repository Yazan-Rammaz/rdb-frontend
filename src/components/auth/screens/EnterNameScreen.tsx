'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FlexibleSpace } from '@/scaling';
import { useTranslation } from '@/context/I18nContext';
import ArrowRight from '@/assets/icons/auth/arrow-right.svg';
import {
    NAME_MAX_LENGTH,
    nameIssue,
    nameIssueWhileTyping,
    normalizeName,
} from '@/lib/nameValidation';

interface EnterNameScreenProps {
    onSubmit: (name: string) => void | Promise<void>;
    loading?: boolean;
}

const ERROR_MESSAGE_ID = 'enter-name-error';

export default function EnterNameScreen({ onSubmit, loading }: EnterNameScreenProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    // Two separate things: whether the arrow is on screen at all, and whether
    // it does anything. Gating the mount on validity would make the control
    // vanish mid-typing, which reads as a glitch rather than as a rule.
    const hasText = name.trim().length > 0;
    const canSubmit = !nameIssue(name) && !loading;

    // Only input that can never become a name speaks while the user types —
    // `O'` on the way to `O'Brien` is mid-word, not a mistake. Length is left
    // to the submit guard.
    const showError = nameIssueWhileTyping(name) === 'invalid-chars';

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(normalizeName(name));
    };

    return (
        <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#F4FFF4' }}>
            <FlexibleSpace grow share={0.45} />

            {/* Title block */}
            <div className="px-xd-30 flex flex-col items-start">
                <h2 className="text-xd-30 font-bold text-[#1D1D1D]">{t.auth.enterName.title}</h2>
                <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-8">
                    {t.auth.enterName.subtitle}
                </p>
                <p className="text-xd-12 font-normal text-[#1D1D1D] mt-xd-4">
                    {t.auth.enterName.description}
                </p>
            </div>

            <FlexibleSpace size={60} share={0} />

            {/* Input row */}
            <div className="px-xd-15">
                {/* `relative` so the error hangs below the row without taking
                    flow height — both spacers on this screen are `grow`, so
                    anything added here would shift the whole screen up. */}
                <div className="relative">
                    <div className="relative flex items-center w-full h-xd-60 rounded-xd-20 border border-dashed border-[#C3C3C3] focus-within:border-[#388CFF] px-xd-16 transition-colors">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder={t.auth.enterName.placeholder}
                            autoFocus
                            dir="auto"
                            autoComplete="name"
                            autoCapitalize="words"
                            maxLength={NAME_MAX_LENGTH}
                            aria-invalid={showError}
                            aria-describedby={ERROR_MESSAGE_ID}
                            className="flex-1 bg-transparent outline-none text-xd-16 font-medium text-[#1D1D1D] placeholder:text-[#1D1D1D]/40 caret-[#1D1D1D] [caret-shape:underscore]"
                        />
                        {hasText && (
                            <button
                                onClick={handleSubmit}
                                disabled={!!loading}
                                aria-disabled={!canSubmit}
                                className={`shrink-0 flex items-center justify-center transition-opacity disabled:opacity-50 ${
                                    canSubmit ? '' : 'opacity-30'
                                }`}
                                aria-label={t.common.accessibility.continue}
                            >
                                <Image
                                    src={ArrowRight}
                                    alt=""
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                />
                            </button>
                        )}
                    </div>
                    {/* Always mounted: a live region has to exist before text is
                        put into it, and `polite` so it does not interrupt the
                        screen reader's own echo of the character just typed. */}
                    <p
                        id={ERROR_MESSAGE_ID}
                        role="status"
                        aria-live="polite"
                        dir="auto"
                        className="absolute inset-x-0 top-full ps-xd-16 pt-xd-4 text-xd-12 leading-xd-14 font-medium text-[#B3261E]"
                    >
                        {showError ? t.auth.enterName.errors.invalidChars : ''}
                    </p>
                </div>
            </div>

            <FlexibleSpace grow share={0.55} />
        </div>
    );
}
