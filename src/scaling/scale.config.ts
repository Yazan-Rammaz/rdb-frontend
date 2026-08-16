/**
 * scale.config.ts — Single source of truth for the scaling system.
 *
 * Every file in src/scaling/ reads from here.
 * Change a value here → it propagates everywhere.
 *
 * Design canvas
 * ─────────────
 * DESIGN_W × DESIGN_H is the XD artboard size.
 * All xd-* utilities and FlexibleSpace use these as the 1:1 reference.
 *
 * Flex system
 * ───────────
 * Between DESIGN_H and FLEX_FREEZE_H the layout compresses/expands
 * via FlexibleSpace (--xd-flex-deficit CSS variable).
 * Below FLEX_FREEZE_H the canvas freezes and uniformly shrinks.
 *
 * Scale clamp
 * ───────────
 * MIN_VW / MAX_VW define the viewport range for the CSS --xd-unit clamp.
 * Outside AppScaler, xd-* utilities scale proportionally within this range.
 */

/** XD artboard width (px) — the base for all horizontal scaling */
export const DESIGN_W = 430; //

/** XD artboard height (px) — the "ideal" viewport height in design-px */
export const DESIGN_H = 932;

/** Minimum viewport height (in design-px) before Phase 2 kicks in.
 *  Below this → canvas freezes at FLEX_FREEZE_H and applies extraScale. */
export const FLEX_FREEZE_H = 750;
export const MAX_H = 1200; // for debugging — max height the system can handle before breaking
/** Total compressible range (design-px) for FlexibleSpace */
export const FLEX_RANGE = DESIGN_H - FLEX_FREEZE_H; // 182

/** Narrowest viewport (px) the CSS clamp considers — prevents text from getting too small */
export const MIN_VW = 350;

/** Widest viewport (px) the CSS clamp considers — prevents over-scaling */
export const MAX_VW = 500;

/** Pre-computed CSS clamp boundaries for useXdScale hook */
export const MIN_SCALE = MIN_VW / DESIGN_W;
export const MAX_SCALE = MAX_VW / DESIGN_W;

/**
 * Outer-background color map.
 * Keys are used as CSS class names: "outer-bg-{key}"
 * Values are hex colors.
 *
 * To add a new outer background:
 *   1. Add an entry here
 *   2. Add matching CSS rule in styles.css:
 *      #app-outer:has(.outer-bg-KEY) { background: VALUE; }
 */
export const OUTER_BG = {
    login: '#E0FFEE',
    signup: '#E0FFEE',
    passcode: '#F4FFF4',
    intro: '#FFFDD0',
    'already-registered': '#F4F8FF',
    'not-registered': '#FFF9F0',
} as const;

export type OuterBgKey = keyof typeof OUTER_BG | string;
