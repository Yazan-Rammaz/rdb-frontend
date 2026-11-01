'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleAlert, CircleCheck } from 'lucide-react';
import type { Feedback } from '@/hooks/useInlineFeedback';

/** Blue of the OTP resend countdown, and the red of the app's field errors. */
export const FEEDBACK_COLOR = {
    success: '#388CFF',
    error: '#FF5F61',
} as const;

const TONE_CLASS = {
    success: 'text-[#388CFF]',
    error: 'text-[#FF5F61]',
} as const;

const CLAMP_CLASS = { 1: 'line-clamp-1', 2: 'line-clamp-2' } as const;

export interface InlineFeedbackProps {
    feedback: Feedback | null;
    /**
     * Positions the line. The caller owns the slot: either an absolutely
     * positioned box inside a `relative` parent, or a fixed-height row that is
     * already part of the layout — never a box that grows when a message lands.
     */
    className?: string;
    /** Horizontal alignment of the line inside its slot. */
    align?: 'center' | 'start';
    /** Maximum number of text lines; longer (server) text is ellipsised. */
    lines?: 1 | 2;
    /** 'dark' gives the line a translucent backing, for text over a camera feed. */
    surface?: 'plain' | 'dark';
}

/**
 * A single status line (icon + text) that fades in and out in place. Opacity
 * and a 2px transform only — no height or position animation — so nothing
 * around it moves. Text only: never markup, never links.
 */
const InlineFeedback: React.FC<InlineFeedbackProps> = ({
    feedback,
    className = '',
    align = 'center',
    lines = 2,
    surface = 'plain',
}) => {
    const reduceMotion = useReducedMotion();
    const Icon = feedback?.tone === 'error' ? CircleAlert : CircleCheck;

    return (
        // The live region stays mounted so screen readers announce what lands in it.
        <div
            role="status"
            aria-live="polite"
            className={`pointer-events-none flex min-w-0 ${align === 'center' ? 'justify-center' : 'justify-start'} ${className}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                {feedback && (
                    <motion.p
                        key={feedback.id}
                        dir="auto"
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex min-w-0 max-w-full items-start gap-xd-5 text-xd-12 font-medium leading-snug ${
                            align === 'center' ? 'text-center' : 'text-start'
                        } ${surface === 'dark' ? 'rounded-xd-10 bg-black/60 px-xd-10 py-xd-4' : ''} ${
                            TONE_CLASS[feedback.tone]
                        }`}
                    >
                        <Icon aria-hidden className="mt-[1px] size-xd-14 shrink-0" strokeWidth={2.25} />
                        <span className={`min-w-0 ${CLAMP_CLASS[lines]}`}>{feedback.text}</span>
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InlineFeedback;
