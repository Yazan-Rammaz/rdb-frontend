'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'warn' | 'info';
export type ToastTheme = 'dark' | 'light';

export interface ToastOptions {
    duration?: number;
    showProgress?: boolean;
}

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
    isPaused: boolean;
    showProgress: boolean;
    createdAt: number;
}

interface ToastContextValue {
    toasts: ToastItem[];
    theme: ToastTheme;
    toast: {
        success: (message: string, options?: ToastOptions) => void;
        error: (message: string, options?: ToastOptions) => void;
        warn: (message: string, options?: ToastOptions) => void;
        info: (message: string, options?: ToastOptions) => void;
    };
    removeToast: (id: string) => void;
    pauseToast: (id: string) => void;
    resumeToast: (id: string) => void;
    clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode; theme?: ToastTheme }> = ({
    children,
    theme = 'dark',
}) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const removeToast = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        timersRef.current.forEach((timer) => clearTimeout(timer));
        timersRef.current.clear();
        setToasts([]);
    }, []);

    const startTimer = useCallback(
        (id: string, duration: number) => {
            const timer = setTimeout(() => {
                removeToast(id);
            }, duration);
            timersRef.current.set(id, timer);
        },
        [removeToast],
    );

    const pauseToast = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isPaused: true } : t)));
    }, []);

    const resumeToast = useCallback(
        (id: string) => {
            setToasts((prev) => {
                const toast = prev.find((t) => t.id === id);
                if (toast && toast.isPaused) {
                    startTimer(id, toast.duration);
                    return prev.map((t) => (t.id === id ? { ...t, isPaused: false } : t));
                }
                return prev;
            });
        },
        [startTimer],
    );

    const addToast = useCallback(
        (type: ToastType, message: string, options?: ToastOptions) => {
            const id = `toast-${++toastIdCounter}`;
            const duration = options?.duration ?? 4000;
            const showProgress = options?.showProgress ?? false;
            const newToast: ToastItem = {
                id,
                type,
                message,
                duration,
                isPaused: false,
                showProgress,
                createdAt: Date.now(),
            };
            setToasts((prev) => [...prev, newToast]);
            startTimer(id, duration);
        },
        [startTimer],
    );

    const toast = useMemo(() => ({
        success: (message: string, options?: ToastOptions) => addToast('success', message, options),
        error: (message: string, options?: ToastOptions) => addToast('error', message, options),
        warn: (message: string, options?: ToastOptions) => addToast('warn', message, options),
        info: (message: string, options?: ToastOptions) => addToast('info', message, options),
    }), [addToast]);

    return (
        <ToastContext.Provider
            value={{ toasts, theme, toast, removeToast, pauseToast, resumeToast, clearAll }}
        >
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
