'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface NumericKeypadProps {
    open: boolean;
    onPress: (digit: string) => void;
    onBackspace: () => void;
    disabled?: boolean;
    keypadRef?: React.RefObject<HTMLDivElement | null>;
}

const KEYS = [
    [
        { digit: '1', letters: '' },
        { digit: '2', letters: '' },
        { digit: '3', letters: '' },
    ],
    [
        { digit: '4', letters: '' },
        { digit: '5', letters: '' },
        { digit: '6', letters: '' },
    ],
    [
        { digit: '7', letters: '' },
        { digit: '8', letters: '' },
        { digit: '9', letters: '' },
    ],
] as const;

const springTransition = {
    type: 'spring' as const,
    damping: 32,
    stiffness: 380,
    mass: 0.75,
};

export function NumericKeypad({
    open,
    onPress,
    onBackspace,
    disabled = false,
    keypadRef,
}: NumericKeypadProps) {
    const backspaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [activeKey, setActiveKey] = useState<string | null>(null);

    const handleDigitDown = useCallback(
        (digit: string) => (e: React.PointerEvent) => {
            e.preventDefault();
            if (disabled) return;
            setActiveKey(digit);
            onPress(digit);
        },
        [disabled, onPress],
    );

    const handleDigitUp = useCallback(() => {
        setTimeout(() => setActiveKey(null), 100);
    }, []);

    const handleBackDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            if (disabled) return;
            setActiveKey('back');
            onBackspace();
            backspaceTimer.current = setTimeout(() => {
                backspaceTimer.current = setInterval(onBackspace, 80) as unknown as ReturnType<
                    typeof setTimeout
                >;
            }, 400);
        },
        [disabled, onBackspace],
    );

    const handleBackUp = useCallback(() => {
        if (backspaceTimer.current) {
            clearInterval(backspaceTimer.current);
            clearTimeout(backspaceTimer.current);
            backspaceTimer.current = null;
        }
        setTimeout(() => setActiveKey(null), 100);
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={keypadRef as unknown as React.Ref<HTMLDivElement>}
                    className="fixed bg-[#1C1C1E] bottom-0 left-0 z-999999 right-0 select-none"
                    style={{ zIndex: 99999999 }}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={springTransition}
                >
                    <div
                        className=" flex flex-col max-w-100 h-[35vh] mx-auto"
                        style={{
                            padding:
                                'calc(var(--xd-unit) * 10) calc(var(--xd-unit) * 3) calc(var(--xd-unit) * 10)',
                            background: '#1C1C1E',
                            gap: 'calc(var(--xd-unit) * 10)',
                        }}
                    >
                        {KEYS.map((row, ri) => (
                            <div
                                key={ri}
                                className="flex flex-1"
                                style={{ gap: 'calc(var(--xd-unit) * 10)' }}
                            >
                                {row.map(({ digit, letters }) => (
                                    <KeyButton
                                        key={digit}
                                        digit={digit}
                                        letters={letters}
                                        isActive={activeKey === digit}
                                        disabled={disabled}
                                        onPointerDown={handleDigitDown(digit)}
                                        onPointerUp={handleDigitUp}
                                    />
                                ))}
                            </div>
                        ))}

                        {/* Bottom row */}
                        <div className="flex flex-1" style={{ gap: 'calc(var(--xd-unit) * 6)' }}>
                            <div className="flex-1" />

                            <KeyButton
                                digit="0"
                                letters="+"
                                isActive={activeKey === '0'}
                                disabled={disabled}
                                onPointerDown={handleDigitDown('0')}
                                onPointerUp={handleDigitUp}
                            />

                            <button
                                type="button"
                                onPointerDown={handleBackDown}
                                onPointerUp={handleBackUp}
                                onPointerLeave={handleBackUp}
                                disabled={disabled}
                                className="flex-1 flex items-center justify-center disabled:opacity-40"
                                style={{
                                    opacity: activeKey === 'back' ? 0.4 : 1,
                                    transition: 'opacity 0.1s',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <svg
                                    viewBox="0 0 26 18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="pointer-events-none"
                                    style={{
                                        width: 'calc(var(--xd-unit) * 26)',
                                        height: 'calc(var(--xd-unit) * 18)',
                                    }}
                                >
                                    <path
                                        d="M8.5 0.5H23.5C24.6046 0.5 25.5 1.39543 25.5 2.5V15.5C25.5 16.6046 24.6046 17.5 23.5 17.5H8.5L0.5 9L8.5 0.5Z"
                                        stroke="#FFFFFF"
                                        strokeWidth="1.2"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M13 6L19 12M19 6L13 12"
                                        stroke="#FFFFFF"
                                        strokeWidth="1.2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

function KeyButton({
    digit,
    letters,
    isActive,
    disabled,
    onPointerDown,
    onPointerUp,
}: {
    digit: string;
    letters: string;
    isActive: boolean;
    disabled: boolean;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
}) {
    return (
        <div className="flex-1 relative">
            {/* Pop-up bubble */}
            {/* <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.06 }}
                        className="absolute left-1/2 flex items-center justify-center pointer-events-none"
                        style={{
                            width: 'calc(var(--xd-unit) * 56)',
                            height: 'calc(var(--xd-unit) * 62)',
                            bottom: 'calc(100% + var(--xd-unit) * 4)',
                            transform: 'translateX(-50%)',
                            zIndex: 50,
                        }}
                    >
                        <svg
                            viewBox="0 0 56 76"
                            className="absolute inset-0 w-full h-full drop-shadow-lg"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M4 0C1.8 0 0 1.8 0 4V52C0 54.2 1.8 56 4 56H18L28 76L38 56H52C54.2 56 56 54.2 56 52V4C56 1.8 54.2 0 52 0H4Z"
                                fill="#636366"
                            />
                        </svg>
                        <span
                            className="relative z-10 font-[system-ui] font-light text-white"
                            style={{
                                fontSize: 'calc(var(--xd-unit) * 32)',
                                marginBottom: 'calc(var(--xd-unit) * 16)',
                            }}
                        >
                            {digit}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence> */}

            <button
                type="button"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                disabled={disabled}
                className="w-full h-full flex flex-col items-center  justify-center disabled:opacity-40"
                style={{
                    borderRadius: 'calc(var(--xd-unit) * 14)',
                    backgroundColor: isActive ? '#5A5A5E' : '#3A3A3C',
                    boxShadow: isActive ? 'none' : '0 1px 0 rgba(0,0,0,0.6)',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background-color 0.04s',
                }}
            >
                <span
                    className="font-[system-ui] font-light text-white leading-none"
                    style={{ fontSize: 'calc(var(--xd-unit) * 32)' }}
                >
                    {digit}
                </span>
                {letters && (
                    <span
                        className="font-[system-ui] font-medium text-white/60 uppercase leading-none"
                        style={{
                            fontSize: 'calc(var(--xd-unit) * 10)',
                            marginTop: 'calc(var(--xd-unit) * 2)',
                            letterSpacing: 'calc(var(--xd-unit) * 1.5)',
                        }}
                    >
                        {letters}
                    </span>
                )}
            </button>
        </div>
    );
}
