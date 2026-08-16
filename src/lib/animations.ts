/**
 * Centralized animation constants.
 * All keyframes and durations are defined in src/styles/styles.css.
 * Reference these via CSS variables so timing is controlled in one place.
 */

export type AnimationType = 'bounce' | 'fly' | 'share' | 'press';

export const ANIMATIONS: Record<AnimationType, { idle: string; busy: string }> = {
    bounce: {
        idle: 'var(--animate-bounce-once)',
        busy: 'var(--animate-bounce-once-busy)',
    },
    fly: {
        idle: 'var(--animate-arrow-fly)',
        busy: 'var(--animate-arrow-fly-busy)',
    },
    share: {
        idle: 'var(--animate-share-pop)',
        busy: 'var(--animate-share-pop-busy)',
    },
    press: {
        idle: 'var(--animate-press-dive)',
        busy: 'var(--animate-press-dive-busy)',
    },
};
