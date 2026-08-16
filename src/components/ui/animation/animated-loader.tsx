'use client';

import React, { useEffect, useState } from 'react';
import { LoaderBarIcon } from '../../icons';

interface AnimatedLoaderProps {
    duration?: number; // Duration in milliseconds for the bar to fill (default: 2000ms)
    onComplete?: () => void;
    className?: string;
}

export const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({
    duration = 1000,
    onComplete,
    className,
}) => {
    const [percent, setPercent] = useState(0);
    const onCompleteRef = React.useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        // Start animation on mount
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);

            setPercent(progress * 100);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (onCompleteRef.current) onCompleteRef.current();
            }
        };

        const animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [duration]); // Removed onComplete from dependency

    return <LoaderBarIcon percent={percent} className={className} />;
};
