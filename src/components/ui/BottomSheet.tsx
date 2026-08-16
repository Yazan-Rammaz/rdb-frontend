'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, Variants } from 'framer-motion';
import { Page } from '@/scaling';

// ============================================================================
// CONFIGURATION - Edit these values to customize the BottomSheet behavior
// ============================================================================

/**
 * ANIMATION TIMING
 * - iosEasing: Main animation curve (iOS-style: fast start, slow end)
 * - iosEasingReverse: Reverse curve for exit animations
 */
const iosEasing = [0.16, 1, 0.3, 1] as const;
const iosEasingReverse = [0.4, 0, 0.6, 1] as const;

/**
 * ANIMATION DURATIONS (in seconds)
 * - SHEET_ANIMATION_DURATION: How long the sheet takes to open/close
 * - BACKDROP_ANIMATION_DURATION: How long the backdrop fade takes
 * - BACKGROUND_SCALE_DURATION: How long the background scale effect takes
 */
const SHEET_ANIMATION_DURATION = 0.45;
const BACKDROP_ANIMATION_DURATION = 0.45;
const BACKGROUND_SCALE_DURATION = 0.45;

/**
 * SHEET APPEARANCE
 * - SHEET_HEIGHT: Default height of the sheet
 * - SHEET_MAX_HEIGHT: Maximum height the sheet can be
 * - SHEET_BORDER_RADIUS: Border radius of the sheet corners
 * - SHEET_BORDER_COLOR: Color of the sheet border
 * - SHEET_SHADOW: Box shadow for the sheet
 */
const SHEET_HEIGHT = '95.5%';
const SHEET_MAX_HEIGHT = '95.5%';
const SHEET_BORDER_RADIUS = '24px'; // rounded-t-3xl = 24px
const SHEET_BORDER_COLOR = '#707070';
const SHEET_SHADOW = '0 -4px 32px rgba(0, 0, 0, 0.15)';

/**
 * BACKDROP APPEARANCE
 * - BACKDROP_COLOR: Background color of the overlay
 * - BACKDROP_BLUR: Blur amount for the backdrop (in px)
 */
const BACKDROP_COLOR = 'rgba(0, 0, 0, 0.9)';
const BACKDROP_BLUR = '1px';

/**
 * DRAG BEHAVIOR
 * - DRAG_CLOSE_THRESHOLD: Percentage of sheet height needed to close (0.5 = 50%)
 * - DRAG_ELASTICITY: How "stretchy" the drag feels (0 = none, 1 = full)
 *   Lower values make drag follow pointer more closely
 */
const DRAG_CLOSE_THRESHOLD = 0.2;
const DRAG_ELASTICITY = 0.7;

/**
 * BACKGROUND SCALE EFFECT
 * - BACKGROUND_SCALE: How much to scale down the background (0.96 = 96%)
 * - BACKGROUND_BORDER_RADIUS: Border radius when scaled
 */
const BACKGROUND_SCALE = 0.96;
const BACKGROUND_BORDER_RADIUS = '16px';

/**
 * DRAG HANDLE APPEARANCE
 * - HANDLE_WIDTH: Width of the drag handle bar
 * - HANDLE_HEIGHT: Height of the drag handle bar
 * - HANDLE_COLOR: Default color of the handle
 * - HANDLE_HOVER_COLOR: Color when hovering
 * - HANDLE_PADDING: Vertical padding around the handle (touch area)
 */
const HANDLE_WIDTH = '40px'; // w-10
const HANDLE_HEIGHT = '4px'; // h-1
const HANDLE_COLOR = 'rgba(156, 163, 175, 0.6)';
const HANDLE_HOVER_COLOR = 'rgba(156, 163, 175, 0.8)';
const HANDLE_PADDING = '12px'; // py-3

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

/**
 * Backdrop fade animation variants
 * - hidden: Fully transparent
 * - visible: Semi-transparent with blur
 * - exit: Fade out (with slight delay)
 */
const backdropVariants: Variants = {
    hidden: { backgroundColor: 'rgba(0,0,0,0)' },
    visible: {
        backgroundColor: BACKDROP_COLOR,
        transition: { duration: 0.4, ease: iosEasing },
    },
    exit: {
        backgroundColor: 'rgba(0,0,0,0)',
        transition: { duration: 0.4, ease: iosEasingReverse },
    },
};

/**
 * Background scale animation variants (for BottomSheetProvider)
 * - normal: Full size, no border radius
 * - scaled: Slightly smaller with rounded corners
 */
const backgroundVariants: Variants = {
    normal: {
        scale: 1,
        borderRadius: '0px',
        transition: {
            duration: SHEET_ANIMATION_DURATION,
            ease: iosEasing,
        },
    },
    scaled: {
        scale: BACKGROUND_SCALE,
        borderRadius: BACKGROUND_BORDER_RADIUS,
        transition: {
            duration: SHEET_ANIMATION_DURATION,
            ease: iosEasing,
        },
    },
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BottomSheetProps {
    /** Controls visibility of the bottom sheet */
    open: boolean;
    /** Callback when the sheet should close */
    onClose: () => void;
    /** Scrollable content area */
    children: React.ReactNode;
    /** Fixed footer (action buttons) — stays pinned at the bottom, never scrolls */
    footer?: React.ReactNode;
    /** Height of the sheet (default: 95.5%) */
    height?: string;
    /** Whether to show the drag handle indicator */
    showDragHandle?: boolean;
    /** Whether drag-to-close is enabled */
    enableDrag?: boolean;
    /** Minimum drag distance to trigger close (px) - DEPRECATED: uses percentage now */
    dragCloseThreshold?: number;
    /** Minimum velocity to trigger close (px/s) - DEPRECATED */
    velocityThreshold?: number;
    /** Whether to show backdrop blur effect */
    enableBackdropBlur?: boolean;
    /** Reference to background content element for scaling effect */
    backgroundRef?: React.RefObject<HTMLElement | null>;
    /** Custom z-index for the sheet */
    zIndex?: number;
    /** Additional className for the sheet container */
    className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BottomSheet: React.FC<BottomSheetProps> = ({
    open,
    onClose,
    children,
    height = SHEET_HEIGHT,
    footer,
    showDragHandle = true,
    enableDrag = true,
    enableBackdropBlur = false,
    backgroundRef,
    zIndex = 50,
    className = '',
}) => {
    // ========== REFS & STATE ==========
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const [sheetHeight, setSheetHeight] = useState(0);

    /**
     * isVisible controls actual rendering — decoupled from `open` prop.
     * When `open` goes false externally, we keep rendering until the exit
     * animation finishes, then call onClose via onExitComplete.
     */
    const [isVisible, setIsVisible] = useState(open);

    // Sync: open → true  →  show immediately
    // Sync: open → false →  trigger exit animation (setIsVisible(false))
    useEffect(() => {
        if (open) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [open]);

    // ========== EFFECTS ==========

    /**
     * EFFECT: Measure sheet height
     * Used to calculate drag close threshold
     */
    useEffect(() => {
        if (sheetRef.current && isVisible) {
            setSheetHeight(sheetRef.current.offsetHeight);
        }
    }, [isVisible]);

    /**
     * EFFECT: Lock body scroll
     * Prevents background scrolling when sheet is open
     */
    useEffect(() => {
        if (isVisible) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isVisible]);

    /**
     * EFFECT: Background scale animation
     * Scales down the background content when sheet opens (iOS-style)
     */
    useEffect(() => {
        if (backgroundRef?.current) {
            const element = backgroundRef.current;
            const transition = `transform ${BACKGROUND_SCALE_DURATION}s cubic-bezier(${iosEasing.join(', ')}), border-radius ${BACKGROUND_SCALE_DURATION}s cubic-bezier(${iosEasing.join(', ')})`;

            if (isVisible) {
                element.style.transition = transition;
                element.style.transform = `scale(${BACKGROUND_SCALE})`;
                element.style.borderRadius = BACKGROUND_BORDER_RADIUS;
                element.style.overflow = 'hidden';
            } else {
                element.style.transition = transition;
                element.style.transform = 'scale(1)';
                element.style.borderRadius = '0px';
            }
        }
    }, [isVisible, backgroundRef]);

    /**
     * EFFECT: Escape key handler
     * Closes sheet when pressing Escape
     */
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isVisible) {
                setIsVisible(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isVisible]);

    // ========== EVENT HANDLERS ==========

    /**
     * HANDLER: Backdrop click
     * Closes sheet when clicking outside the sheet content
     */
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setIsVisible(false);
        }
    }, []);

    /**
     * HANDLER: Drag end
     * Determines whether to close the sheet based on drag distance
     */
    const handleDragEnd = useCallback(
        (_: any, info: { offset: { y: number } }) => {
            const threshold = sheetHeight * DRAG_CLOSE_THRESHOLD;
            if (info.offset.y > threshold) {
                setIsVisible(false);
            }
        },
        [sheetHeight],
    );

    /**
     * HANDLER: Drag handle pointer down
     * Initiates drag from the handle area only
     */
    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            dragControls.start(e);
        },
        [dragControls],
    );

    // ========== RENDER ==========

    return (
        <AnimatePresence mode="sync" onExitComplete={onClose}>
            {isVisible && (
                // BACKDROP OVERLAY
                <motion.div
                    className="fixed inset-0 flex items-end justify-center"
                    style={{
                        zIndex,
                        ...(enableBackdropBlur && {
                            backdropFilter: `blur(${BACKDROP_BLUR})`,
                            WebkitBackdropFilter: `blur(${BACKDROP_BLUR})`,
                        }),
                    }}
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={handleBackdropClick}
                >
                    {/* SHEET CONTAINER */}
                    <motion.div
                        ref={sheetRef}
                        id="bottom-sheet"
                        className={`w-full bg-background border-t border-x relative will-change-transform flex flex-col rounded-t-xd-24 ${className}`}
                        style={{
                            height: height,
                            maxHeight: SHEET_MAX_HEIGHT,
                            borderColor: SHEET_BORDER_COLOR,
                            boxShadow: SHEET_SHADOW,
                            opacity: 1,
                            touchAction: 'none',
                        }}
                        // Animation
                        initial={{ y: '100%', opacity: 1 }}
                        animate={{
                            y: 0,
                            opacity: 1,
                            transition: {
                                type: 'spring',
                                stiffness: 280,
                                damping: 40,
                                mass: 1,
                            },
                        }}
                        exit={{
                            y: '100%',
                            opacity: 1,
                            transition: {
                                type: 'spring',
                                stiffness: 280,
                                damping: 40,
                                mass: 1,
                            },
                        }}
                        // Drag configuration
                        drag={enableDrag ? 'y' : false}
                        dragControls={dragControls}
                        dragListener={false} // Only drag from handle
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: DRAG_ELASTICITY }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* DRAG HANDLE */}
                        {showDragHandle && (
                            <motion.div
                                className="w-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none py-xd-12"
                                style={{ touchAction: 'none' }}
                                onPointerDown={handlePointerDown}
                            >
                                <motion.div
                                    className="rounded-full w-xd-40 h-xd-4"
                                    style={{ backgroundColor: HANDLE_COLOR }}
                                    whileHover={{
                                        scale: 1.1,
                                        backgroundColor: HANDLE_HOVER_COLOR,
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </motion.div>
                        )}

                        {/* UPPER DRAG ZONE — top half of sheet is draggable */}
                        <div
                            className="absolute top-0 left-0 right-0 h-1/11 cursor-grab active:cursor-grabbing z-10"
                            style={{ touchAction: 'none' }}
                            onPointerDown={handlePointerDown}
                        />

                        {/* SHEET CONTENT — scrollable */}
                        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col items-center min-h-0">
                            {children}
                        </div>

                        {/* FOOTER — fixed at bottom, never scrolls */}
                        {footer && <div className="shrink-0 w-full">{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * BottomSheetProvider
 * Wrap your app content with this to enable background scaling effect
 *
 * Usage:
 * <BottomSheetProvider isSheetOpen={isOpen}>
 *   <YourAppContent />
 * </BottomSheetProvider>
 */
export const BottomSheetProvider: React.FC<{
    children: React.ReactNode;
    isSheetOpen: boolean;
}> = ({ children, isSheetOpen }) => {
    return (
        <motion.div
            className="min-h-screen origin-top"
            variants={backgroundVariants}
            initial="normal"
            animate={isSheetOpen ? 'scaled' : 'normal'}
        >
            {children}
        </motion.div>
    );
};

export default BottomSheet;
