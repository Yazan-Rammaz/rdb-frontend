'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { FlexibleSpace } from '@/scaling';
import closeSvg from '@/assets/icons/auth/close.svg';
import type { QuizQuestion, ResetAnswer } from '@/services/resetPasscode/resetPasscodeApi';

interface QuizScreenProps {
    questions: QuizQuestion[];
    onComplete: (answers: ResetAnswer[]) => void | Promise<void>;
    onClose?: () => void;
}

// Slide direction follows navigation: +1 moves forward (card enters from the
// right), -1 moves back (card enters from the left).
const cardVariants = {
    enter: (dir: number) => ({ x: dir >= 0 ? '60%' : '-60%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir >= 0 ? '-60%' : '60%', opacity: 0 }),
};

const listVariants = {
    center: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const itemVariants = {
    enter: { opacity: 0, y: 16 },
    center: { opacity: 1, y: 0 },
};

// Horizontal drag distance (px) past which a swipe flips to the next/previous
// question.
const SWIPE_THRESHOLD = 60;

// How long the "review by swiping" hint stays up on the last question.
const HINT_VISIBLE_MS = 5000;

/**
 * Security quiz (Image #3) — one backend-defined question at a time. The user
 * swipes left/right to move between questions; a row of dots at the bottom
 * marks progress (blue = current). Selecting an option on an earlier question
 * auto-advances. On the LAST question a hint slides up from the bottom for 5s
 * telling the user they can swipe back to review/change answers — and selecting
 * its answer IS the submit (the chosen answers are kept and graded).
 */
export default function QuizScreen({ questions, onComplete, onClose }: QuizScreenProps) {
    const [[qi, direction], setPage] = useState<[number, number]>([0, 0]);
    const [answers, setAnswers] = useState<ResetAnswer[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showHint, setShowHint] = useState(false);

    const q = questions[qi];
    const isLast = qi === questions.length - 1;
    const selectedId = q
        ? (answers.find((a) => a.questionId === q.id)?.optionId ?? null)
        : null;

    // Move by a signed step, clamped to the question range. The step also drives
    // the slide direction for the card animation.
    const paginate = (step: number) => {
        const next = qi + step;
        if (next < 0 || next >= questions.length) return;
        setPage([next, step]);
    };

    const goTo = (index: number) => {
        if (index === qi || index < 0 || index >= questions.length) return;
        setPage([index, index > qi ? 1 : -1]);
    };

    // Show the review hint from the bottom for 5s the first time the user lands
    // on the last question.
    const hintShownRef = useRef(false);
    useEffect(() => {
        if (!isLast || hintShownRef.current) return;
        hintShownRef.current = true;
        setShowHint(true);
        const id = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS);
        return () => clearTimeout(id);
    }, [isLast]);

    if (!q) return null;

    const handleSelect = (optionId: string) => {
        if (submitting) return;
        const next = [
            ...answers.filter((a) => a.questionId !== q.id),
            { questionId: q.id, optionId },
        ];
        setAnswers(next);

        // Earlier questions slide forward after a beat so the selection registers
        // visually. The last question's answer IS the submit: keep the chosen
        // answer, send the hint back down, and grade the full set.
        if (!isLast) {
            setTimeout(() => paginate(1), 360);
            return;
        }
        setShowHint(false);
        setTimeout(async () => {
            setSubmitting(true);
            try {
                await onComplete(next);
            } finally {
                setSubmitting(false);
            }
        }, 360);
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (submitting) return;
        if (info.offset.x <= -SWIPE_THRESHOLD) paginate(1);
        else if (info.offset.x >= SWIPE_THRESHOLD) paginate(-1);
    };

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close button */}
            <div className="flex absolute justify-end right-xd-30 top-xd-30">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-xd-24 h-xd-24 flex items-center justify-center"
                    >
                        <Image
                            src={closeSvg}
                            alt="close"
                            width={16}
                            height={16}
                            className="object-contain"
                        />
                    </button>
                )}
            </div>

            <FlexibleSpace share={0.5} size={188} />
            {/* Faded title block */}
            <div className="px-xd-40">
                <h2 className="text-xd-30 font-bold text-[#C3C3C3]">Reset Passcode !</h2>
                <p className="text-xd-12 text-[#C3C3C3] mt-xd-8 leading-relaxed">
                    Don&apos;t Worry, We Will Help You Reset Your Passcode By Following These Steps.
                </p>
            </div>

            <FlexibleSpace size={20} share={0.2} />

            {/* Question card + options (swipe left/right to navigate) */}
            <div className="px-xd-20 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <motion.div
                        key={q.id}
                        custom={direction}
                        variants={cardVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="w-xd-390 touch-pan-y"
                    >
                        {/* Question card */}
                        <div className="w-full h-xd-105 rounded-xd-20 bg-[#3B5BA5] flex items-center justify-center px-xd-20 py-xd-18 shadow-sm">
                            <p className="text-xd-14 font-medium text-[#FCFCFC] text-center leading-snug">
                                {q.text}
                            </p>
                        </div>
                        {/* Options */}
                        <motion.div
                            variants={listVariants}
                            initial="enter"
                            animate="center"
                            className="flex flex-col gap-xd-4 mt-xd-7"
                        >
                            {q.options.map((opt) => {
                                const isSelected = selectedId === opt.id;
                                return (
                                    <motion.button
                                        key={opt.id}
                                        variants={itemVariants}
                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        onClick={() => handleSelect(opt.id)}
                                        disabled={submitting}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full h-xd-60 rounded-xd-20 border border-dashed flex items-center justify-center text-xd-16 transition-colors ${
                                            isSelected
                                                ? 'border-[#3B5BA5] bg-[#eceef8] text-[#1D1D1D]'
                                                : 'border-[#1D1D1D] bg-[#FCFCFC] text-[#1D1D1D]'
                                        }`}
                                    >
                                        {opt.label}
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom: review hint (last question) + progress dots */}
            <div className="px-xd-20 pb-xd-6 flex flex-col items-center gap-xd-14">
                <AnimatePresence>
                    {showHint && (
                        <motion.p
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="text-xd-12 text-[#8E8E8E] text-center leading-relaxed px-xd-10"
                        >
                            Not sure? Swipe left or right to review and change your earlier answers.
                            Answering this last question submits the quiz.
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Progress dots — current question is blue */}
                <div className="flex items-center justify-center gap-xd-8">
                    {questions.map((question, index) => {
                        const active = index === qi;
                        return (
                            <button
                                key={question.id}
                                onClick={() => goTo(index)}
                                disabled={submitting}
                                aria-label={`Question ${index + 1}`}
                                className={`rounded-full transition-all duration-300 ${
                                    active
                                        ? 'w-xd-20 h-xd-8 bg-[#3B5BA5]'
                                        : 'w-xd-8 h-xd-8 bg-[#D9D9D9]'
                                }`}
                            />
                        );
                    })}
                </div>
            </div>

            <FlexibleSpace size={10} />
        </div>
    );
}
