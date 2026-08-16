'use client';

import { useState, useEffect } from 'react';
import { DESIGN_W, MIN_SCALE, MAX_SCALE } from './scale.config';

/**
 * useXdScale — returns vw / DESIGN_W clamped to [MIN_SCALE, MAX_SCALE].
 *
 * Formula: clamp(MIN_VW/DESIGN_W, vw/DESIGN_W, MAX_VW/DESIGN_W)
 *
 * Use ONLY for JS-driven values (Framer Motion animate widths).
 * For static layout prefer the CSS xd-* utility classes.
 */
function computeScale(): number {
    if (typeof window === 'undefined') return 1;
    const vwScale = window.innerWidth / DESIGN_W;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, vwScale));
}

export function useXdScale(): number {
    const [scale, setScale] = useState(computeScale);

    useEffect(() => {
        const update = () => setScale(computeScale());
        window.addEventListener('resize', update, { passive: true });
        return () => window.removeEventListener('resize', update);
    }, []);

    return scale;
}
