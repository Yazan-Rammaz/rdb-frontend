'use client';

import React from 'react';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/I18nContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const { toasts, theme, removeToast, pauseToast, resumeToast } = useToast();
    const { rtl } = useTranslation();

    return (
        <div className={`fixed top-6 z-999999 ${rtl ? 'left-6' : 'right-6'}`}>
            <div className="relative">
                {toasts.map((toast, index) => {
                    const reverseIndex = toasts.length - 1 - index;
                    const isFirst = reverseIndex === 0;
                    const offset = reverseIndex * 8;
                    const scale = 1 - reverseIndex * 0.03;
                    const opacity = reverseIndex > 2 ? 0 : 1 - reverseIndex * 0.15;

                    return (
                        <div
                            key={toast.id}
                            className="animate-slide-in"
                            style={{
                                position: reverseIndex === 0 ? 'relative' : 'absolute',
                                top: 0,
                                [rtl ? 'left' : 'right']: 0,
                                transform: `translateY(${offset}px) scale(${scale})`,
                                transformOrigin: rtl ? 'top left' : 'top right',
                                zIndex: toasts.length - reverseIndex,
                                opacity,
                                pointerEvents: isFirst ? 'auto' : 'none',
                                transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
                            }}
                        >
                            <Toast
                                toast={toast}
                                theme={theme}
                                onRemove={removeToast}
                                onPause={pauseToast}
                                onResume={resumeToast}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ToastContainer;
