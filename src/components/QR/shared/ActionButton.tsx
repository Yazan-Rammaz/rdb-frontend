'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ANIMATIONS, type AnimationType } from '@/lib/animations';

export function ActionButton({
    icon,
    label,
    labelColor,
    onClick,
    disabled = false,
    filter,
    bounceOnClick = false,
    animationType = 'bounce',
    stopAnimation = false,
    forceAnimation = false,
}: {
    icon: any;
    label: string;
    labelColor?: string;
    onClick?: () => void | Promise<void>;
    disabled?: boolean;
    filter?: string;
    bounceOnClick?: boolean;
    animationType?: AnimationType;
    stopAnimation?: boolean;
    forceAnimation?: boolean;
}) {
    const [isBusy, setIsBusy] = useState(false);
    const iconRef = useRef<HTMLDivElement>(null);

    const { idle: idleAnim, busy: busyAnim } = ANIMATIONS[animationType];
    const forceStartedRef = useRef(false);

    useEffect(() => {
        if (!iconRef.current) return;
        if (forceAnimation) {
            forceStartedRef.current = true;
            const el = iconRef.current;
            el.style.animation = 'none';
            void el.offsetHeight;
            el.style.animation = idleAnim;
        } else if (forceStartedRef.current) {
            forceStartedRef.current = false;
            iconRef.current.style.animation = '';
        }
    }, [forceAnimation, idleAnim]);

    useEffect(() => {
        if (stopAnimation && iconRef.current) {
            iconRef.current.style.animation = '';
        }
    }, [stopAnimation]);

    const handleClick = async () => {
        if (disabled || isBusy) return;

        const result = onClick?.();
        const isAsync = result != null && typeof (result as Promise<void>).then === 'function';

        if (bounceOnClick && iconRef.current) {
            const el = iconRef.current;
            el.style.animation = 'none';
            void el.offsetHeight; // force reflow to restart animation
            el.style.animation = isAsync ? busyAnim : idleAnim;
        }

        if (isAsync) {
            setIsBusy(true);
            try {
                await result;
            } finally {
                setIsBusy(false);
                if (iconRef.current) {
                    iconRef.current.style.animation = 'none';
                }
            }
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || isBusy}
            className="flex cursor-pointer flex-col items-center gap-xd-5 transition-opacity hover:opacity-70 active:opacity-50 disabled:opacity-50"
        >
            {icon && (
                <div ref={iconRef} style={{ filter: filter || 'none' }}>
                    <Image
                        width={20}
                        height={20}
                        src={icon}
                        alt={label}
                        className="size-xd-20 object-contain"
                    />
                </div>
            )}
            <span
                className={`text-xd-11 leading-xd-16 font-normal ${labelColor || 'text-[#1D1D1D]'}`}
            >
                {label}
            </span>
        </button>
    );
}
