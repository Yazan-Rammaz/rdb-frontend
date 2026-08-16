/**
 * src/scaling/ — Unified scaling system.
 *
 * All constants come from scale.config.ts.
 * Change a value there → it propagates to every file here.
 *
 * Usage:
 *   import { Page, FlexibleSpace, useXdScale } from '@/scaling';
 *   import { DESIGN_W, OUTER_BG } from '@/scaling/scale.config';
 */

export { default as Page } from './Page';
export { default as AppScaler } from './AppScaler';
export { default as FlexibleSpace } from './FlexibleSpace';
export { useXdScale } from './useXdScale';
export * from './scale.config';
