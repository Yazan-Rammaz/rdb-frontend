import type { Transition } from 'framer-motion';

/** iOS navigation easing — copied from the root dashboard's motion presets. */
export const iosEase: Transition = {
    duration: 0.35,
    ease: [0.32, 0.72, 0, 1],
};
