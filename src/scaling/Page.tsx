'use client';

import React from 'react';
import AppScaler from './AppScaler';
import type { OuterBgKey } from './scale.config';

type PageVariant = 'scaled' | 'full';

/**
 * Page — top-level wrapper for every route.
 *
 * variant="scaled" (default)
 *   430px design canvas scaled to fit the viewport via AppScaler.
 *
 * variant="full"
 *   No scaling — raw viewport control. For maps, media viewers, etc.
 *
 * outerBg
 *   Colors the area outside the 430px canvas on wide screens.
 *   Use a key from OUTER_BG in scale.config.ts ("login" | "signup" | ...).
 *   For screens that change bg dynamically (e.g. AuthSuccess),
 *   add the class "outer-bg-{key}" directly on the screen's root div.
 */
export default function Page({
    variant = 'scaled',
    landscapeThreshold = 1.7,
    outerBg,
    children,
}: {
    variant?: PageVariant;
    landscapeThreshold?: number;
    outerBg?: OuterBgKey;
    children: React.ReactNode;
}) {
    if (variant === 'scaled') {
        return (
            <AppScaler landscapeThreshold={landscapeThreshold}>
                <div
                    className={`w-full h-full ${outerBg ? ` outer-bg-${outerBg} bg-${outerBg}` : ''}`}
                >
                    {children}
                </div>
            </AppScaler>
        );
    }

    return <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>{children}</div>;
}
