'use client';

import React, { useRef } from 'react';
import { useTranslation } from '@/context/I18nContext';
import type { TranslationSchema } from '@/i18n/locales/en';
import type { RecipientInputMode } from './types';

interface RecipientModeTabsProps {
    mode: RecipientInputMode;
    onModeChange: (mode: RecipientInputMode) => void;
    disabled?: boolean;
}

/** One entry per way of naming a recipient. Add a mode here to get its tab. */
const RECIPIENT_MODES: {
    mode: RecipientInputMode;
    label: (t: TranslationSchema) => string;
}[] = [
    { mode: 'account', label: (t) => t.transfer.recipient.recipientAccount },
    { mode: 'phone', label: (t) => t.transfer.recipient.recipientPhoneNumber },
];

const RecipientModeTabs: React.FC<RecipientModeTabsProps> = ({ mode, onModeChange, disabled }) => {
    const { t, rtl } = useTranslation();
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Arrow keys move between tabs, as the tablist pattern expects.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const forward = (e.key === 'ArrowRight') !== rtl;
        const count = RECIPIENT_MODES.length;
        const next = (index + (forward ? 1 : -1) + count) % count;
        tabRefs.current[next]?.focus();
        onModeChange(RECIPIENT_MODES[next].mode);
    };

    return (
        // One joined control: the frame carries the border and the corners.
        // There is no straight divider — the active tab is rounded like a
        // switch knob, so its curved edge is what separates the two.
        <div
            role="tablist"
            aria-label={t.transfer.sendTo}
            className="flex w-full overflow-hidden rounded-xd-12 border border-[#3C3C3C] bg-white"
        >
            {RECIPIENT_MODES.map(({ mode: tabMode, label }, index) => {
                const isActive = tabMode === mode;
                return (
                    <button
                        key={tabMode}
                        ref={(el) => {
                            tabRefs.current[index] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        disabled={disabled}
                        onClick={() => onModeChange(tabMode)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`flex-1 min-w-0 min-h-xd-36 px-xd-8 py-xd-6 rounded-xd-11 text-xd-11 font-medium leading-tight text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive ? 'bg-[#3C3C3C] text-white' : 'bg-white text-[#1D1D1D]'
                        }`}
                    >
                        {label(t)}
                    </button>
                );
            })}
        </div>
    );
};

export default RecipientModeTabs;
