'use client';

import React, { JSX, useEffect, useState } from 'react';
import { ToastItem, ToastTheme } from '@/context/ToastContext';

interface ToastProps {
    toast: ToastItem;
    theme: ToastTheme;
    onRemove: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
}

const typeConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
    success: {
        color: '#22C55E',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"
                    fill="#22C55E"
                />
            </svg>
        ),
    },
    error: {
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"
                    fill="#EF4444"
                />
            </svg>
        ),
    },
    warn: {
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M1 18h18L10 1 1 18zm10-3H9v-2h2v2zm0-4H9V7h2v4z" fill="#F59E0B" />
            </svg>
        ),
    },
    info: {
        color: '#388CFF',
        bgColor: 'rgba(56, 140, 255, 0.1)',
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9V9h2v6zm0-8H9V5h2v2z"
                    fill="#388CFF"
                />
            </svg>
        ),
    },
};

const themeStyles = {
    dark: {
        bg: 'rgba(60, 60, 60, 0.95)',
        text: '#FFFFFF',
        closeBtn: '#8D8D8D',
        closeBtnHover: '#FFFFFF',
        shadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.05)',
    },
    light: {
        bg: 'rgba(255, 255, 255, 0.98)',
        text: '#1D1D1D',
        closeBtn: '#8D8D8D',
        closeBtnHover: '#1D1D1D',
        shadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)',
    },
};

const Toast: React.FC<ToastProps> = ({ toast, theme, onRemove, onPause, onResume }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const config = typeConfig[toast.type];
    const colors = themeStyles[theme];

    useEffect(() => {
        if (!toast.showProgress || toast.isPaused) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
            setProgress(remaining);
        }, 30);

        return () => clearInterval(interval);
    }, [toast.duration, toast.isPaused, toast.showProgress]);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm transition-all duration-200 ease-out ${
                isExiting
                    ? 'opacity-0 translate-x-8 scale-95'
                    : 'opacity-100 translate-x-0 scale-100'
            }`}
            style={{
                background: colors.bg,
                border: `1px solid ${config.color}40`,
                boxShadow: colors.shadow,
                minWidth: 280,
                maxWidth: 360,
            }}
            onMouseEnter={() => onPause(toast.id)}
            onMouseLeave={() => onResume(toast.id)}
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: config.bgColor }}
            >
                {config.icon}
            </div>
            <p className="flex-1 text-xs leading-snug" style={{ color: colors.text }}>
                {toast.message}
            </p>
            <button
                onClick={handleRemove}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0"
                style={{ color: colors.closeBtn }}
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                        d="M11 1L1 11M1 1l10 10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            </button>
            {toast.showProgress && (
                <div
                    className="absolute bottom-0 left-0 h-0.5 rounded-b-xl transition-all duration-100"
                    style={{
                        width: `${progress}%`,
                        background: config.color,
                    }}
                />
            )}
        </div>
    );
};

export default Toast;
