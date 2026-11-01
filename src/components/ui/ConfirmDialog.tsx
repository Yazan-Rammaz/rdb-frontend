'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASING = [0.4, 0, 0.2, 1] as const;
const DURATION = 0.35;
const BACKDROP_COLOR = 'rgba(0, 0, 0, 0.4)';

export interface ConfirmDialogProps {
    open: boolean;
    onConfirm: ((inputValue?: string) => void);
    onCancel: () => void;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Optional input field inside the dialog */
    inputConfig?: {
        placeholder?: string;
        defaultValue?: string;
    };
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onConfirm,
    onCancel,
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    inputConfig,
}) => {
    const [inputValue, setInputValue] = useState(inputConfig?.defaultValue || '');

    useEffect(() => {
        if (open && inputConfig?.defaultValue) {
            setInputValue(inputConfig.defaultValue);
        }
    }, [open, inputConfig?.defaultValue]);
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onCancel();
            }
        },
        [onCancel],
    );

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onCancel]);

    useEffect(() => {
        if (open) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 flex items-center justify-center"
                    style={{ zIndex: 60, backgroundColor: BACKDROP_COLOR }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: DURATION * 0.6, ease: EASING } }}
                    exit={{ opacity: 0, transition: { duration: DURATION * 0.6, ease: EASING } }}
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        className="bg-white rounded-2xl shadow-xl mx-6 w-full max-w-sm overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            transition: { duration: DURATION, ease: EASING },
                        }}
                        exit={{
                            scale: 0.9,
                            opacity: 0,
                            transition: { duration: DURATION * 0.7, ease: EASING },
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 pt-6 pb-4">
                            <h3 className="text-lg font-bold text-[#404040] text-center">
                                {title}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 text-center">
                                {message}
                            </p>
                            {inputConfig && (
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={inputConfig.placeholder}
                                    className="w-full mt-3 px-3 py-2.5 text-sm text-[#1D1D1D] bg-gray-50 border border-gray-200 rounded-xl focus:border-[#388CFF] focus:outline-0 transition-colors"
                                />
                            )}
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-[#404040] transition-colors hover:bg-gray-100 active:bg-gray-200"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => onConfirm(inputConfig ? inputValue : undefined)}
                                className="flex-1 py-3 rounded-xl bg-[#3066CC] text-sm font-medium text-white transition-colors hover:bg-[#254E9E] active:bg-[#1e3f80]"
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
