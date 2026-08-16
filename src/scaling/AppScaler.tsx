'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DESIGN_W,
    DESIGN_H,
    FLEX_FREEZE_H,
    FLEX_RANGE,
    MAX_H,
    MAX_SCALE,
    MIN_SCALE,
    OUTER_BG,
} from './scale.config';

/**
 * Render children outside #master-canvas so they are unaffected by AppScaler's transform.
 * Portals into #app-outer which sits at fixed inset:0 with no transform.
 */
export function UnscaledPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    const target = document.getElementById('app-outer');
    if (!target) return null;
    return createPortal(children, target);
}

/** Shorthand alias — use inside AppScaler JSX to exclude a subtree from scaling. */
export const Unscaled = UnscaledPortal;

/**
 * AppScaler — Two-phase adaptive scale engine.
 *
 * Reads all constants from scale.config.ts.
 *
 * Portrait (vw ≤ vh):
 *   Phase 1 (FLEX_FREEZE_H ≤ availH):
 *     Canvas height = availH. FlexibleSpace compresses via --xd-flex-deficit.
 *   Phase 2 (availH < FLEX_FREEZE_H):
 *     Canvas frozen at FLEX_FREEZE_H. extraScale shrinks everything uniformly.
 *
 * Landscape (vw > vh):
 *   Scale to fit height. Canvas centered horizontally. No flex deficit.
 */
export default function AppScaler({
    children,
    landscapeThreshold = 1.7,
}: {
    children: React.ReactNode;
    landscapeThreshold?: number;
}) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [debug, setDebug] = useState({ vw: 0, vh: 0, rt: 0, sw: 0, sh: 0 });

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        document.body.style.overflow = 'hidden';
        document.body.style.background = 'transparent';

        // Inject --xd-unit on :root from scale.config.ts (overrides CSS SSR fallback)
        document.documentElement.style.setProperty(
            '--xd-unit',
            `clamp(${MIN_SCALE}px, calc(100vw / ${DESIGN_W}), ${MAX_SCALE}px)`,
        );

        // Inject outer-background CSS rules from OUTER_BG config — no manual CSS needed
        const styleId = 'xd-outer-bg';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = Object.entries(OUTER_BG)
                .map(([key, color]) => `#app-outer:has(.outer-bg-${key}) { background: ${color}; }`)
                .join('\n');
            document.head.appendChild(style);
        }

        let debounceTimer: ReturnType<typeof setTimeout>;

        const compute = () => {
            const vw = window.innerWidth;
            const rawVh = window.innerHeight;
            // Keyboard-open guard: if the current height is less than 70% of the
            // available screen height (CSS pixels), the soft keyboard is likely open.
            // Use the screen height instead so the scaler doesn't shrink the app.
            const screenVh =
                (window.screen.availHeight || window.screen.height) /
                (window.devicePixelRatio || 1);
            const effectiveVh = rawVh < screenVh * 0.7 ? screenVh : rawVh;
            const vh = Math.min(effectiveVh, MAX_H);
            const root = document.documentElement;
            const rt = vh / vw;
            setDebug({ vw, vh, rt, sw: window.screen.width, sh: window.screen.height });
            if (rt < landscapeThreshold) {
                const scale = vh / DESIGN_H;
                const leftOffset = (vw - DESIGN_W * scale) / 2;
                el.style.height = `${DESIGN_H}px`;
                el.style.left = `${leftOffset}px`;
                el.style.transform = `scale(${scale})`;
                root.style.setProperty('--app-scale', String(scale));
                root.style.setProperty('--xd-flex-deficit', '0px');
                return;
            }

            // Portrait — cap widthScale at MAX_SCALE so canvas never over-scales on wide screens
            const widthScale = Math.min(vw / DESIGN_W, MAX_SCALE);
            const availH = vh / widthScale;

            const flexDeficit = Math.min(Math.max(0, DESIGN_H - availH), FLEX_RANGE);

            const extraScale = availH < FLEX_FREEZE_H ? availH / FLEX_FREEZE_H : 1;
            const totalScale = widthScale * extraScale;

            const domH = availH >= FLEX_FREEZE_H ? Math.ceil(availH) : FLEX_FREEZE_H;

            const leftOffset = (vw - DESIGN_W * totalScale) / 2;

            el.style.height = `${domH}px`;
            el.style.left = `${leftOffset}px`;
            el.style.transform = `scale(${totalScale})`;

            root.style.setProperty('--app-scale', String(totalScale));
            root.style.setProperty('--xd-flex-deficit', `${flexDeficit}px`);
        };

        const onWindowResize = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(compute);
        };

        compute();
        // Only listen to window.resize (orientation changes, desktop resize).
        // visualViewport.resize fires on keyboard open/close and would cause the
        // app to shrink — the keyboard guard in compute() handles that instead.
        window.addEventListener('resize', onWindowResize, { passive: true });

        return () => {
            clearTimeout(debounceTimer);
            window.removeEventListener('resize', onWindowResize);
            document.body.style.overflow = '';
            document.body.style.background = '';
        };
    }, [landscapeThreshold]);

    return (
        <div id="app-outer" style={{ position: 'fixed', inset: 0 }}>
            {/* <div
                // className="hidden"
                style={{
                    display: 'hidden',
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    fontSize: 12,
                    padding: '2px 6px',
                    pointerEvents: 'none',
                    fontFamily: 'monospace',
                    borderBottomLeftRadius: 4,
                }}
            >
                {`vw: ${debug.vw.toFixed(0)}, vh: ${debug.vh.toFixed(0)}, rt: ${debug.rt.toFixed(1)} | screen: ${debug.sw.toFixed(0)}×${debug.sh.toFixed(0)}`}
            </div> */}
            <div
                ref={canvasRef}
                id="master-canvas"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: `calc((100vw - ${DESIGN_W}px) / 2)`,
                    width: DESIGN_W,
                    height: DESIGN_H - 100,
                    transformOrigin: 'top left',
                    transform: 'scale(1)',
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
        </div>
    );
}
