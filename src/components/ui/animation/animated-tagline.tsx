'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTranslation } from '@/context/I18nContext';

interface AnimatedTaglineProps {
    words: string[];
    duration: number;
    className?: string;
}

export const AnimatedTagline: React.FC<AnimatedTaglineProps> = ({
    words,
    duration,
    className = '',
}) => {
    const { rtl } = useTranslation();
    const [index, setIndex] = useState(0);
    const [isStarted, setIsStarted] = useState(false);


    // Initial start delay
    useEffect(() => {
        const timer = setTimeout(() => setIsStarted(true), 200);
        return () => clearTimeout(timer);
    }, []);

    // Cycle words
    useEffect(() => {
        if (!isStarted) return;

        // Calculate time per word
        const effectiveDuration = Math.max(duration - 200, 1000);
        const cycleTime = effectiveDuration / words.length;

        const timer = setInterval(() => {
            setIndex((prev) => {
                if (prev < words.length - 1) return prev + 1;
                clearInterval(timer); // Stop at last word
                return prev;
            });
        }, cycleTime);

        return () => clearInterval(timer);
    }, [isStarted, duration, words.length]);

    // Container variants for staggering children
    const containerVariants: Variants = {
        hidden: { opacity: 1 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02,
                delayChildren: 0,
            },
        },
        exit: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02,
                staggerDirection: 1,
            },
        },
    };

    // Letter variants: Slide in from Start, Slide out to End
    const letterVariants: Variants = {
        hidden: {
            opacity: 0,
            x: rtl ? 50 : -50,
            scale: 0.8,
            filter: 'blur(4px)',
            transition: {
                duration: 0,
                ease: 'easeInOut',
            } as const,
        },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            filter: 'blur(0px)',
            transition: {
                type: 'spring',
                damping: 20,
                stiffness: 200,
            } as const,
        },
        exit: {
            opacity: 0,
            x: rtl ? -50 : 50,
            scale: 0.8,
            filter: 'blur(4px)',
            transition: {
                duration: 0,
                ease: 'easeInOut',
            } as const,
        },
    };

    return (
        <div
            className={`flex items-start justify-center mt-2.5 h-full overflow-hidden ${className}`}
        >
            <AnimatePresence mode="wait">
                {isStarted && (
                    <motion.div
                        key={index}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex items-center text-black justify-center w-full"
                    >
                        {words[index].split('').map((char, i) => (
                            <motion.span
                                key={`${index}-${i}`}
                                variants={letterVariants}
                                className="inline-block text-black text-xs leading-5 font-normal"
                                style={{
                                    fontFamily: 'var(--font-quicksand), sans-serif',
                                    marginInlineEnd: char === ' ' ? '0.25em' : '0',
                                }}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
