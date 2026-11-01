'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { useIsOnline } from '@/hooks/useIsOnline';

/** How long the offline message stays before the pill shrinks to its icon. */
const OFFLINE_TEXT_MS = 2000;
/** The restored icon is shown alone for this long before its message unfolds. */
const RESTORED_ICON_MS = 400;
const RESTORED_VISIBLE_MS = 2000;

type Phase =
    | 'hidden'
    | 'offline-expanded'
    | 'offline-collapsed'
    | 'restored-icon'
    | 'restored-expanded';

/**
 * The app's only "no connection" message. A pill floating at the top centre:
 * red while the origin is unreachable, green once it answers again. Screens
 * stay silent about network failures and disable their network actions
 * instead — this is what explains the disabled state.
 *
 * Offline, the message shows for two seconds and then folds away, leaving only
 * the icon so the pill never sits over the header actions. Back online, the
 * icon turns green first and the message unfolds after it.
 *
 * Fixed and out of the layout flow, so it never moves anything; the wrapper
 * takes no pointer events, so it never swallows a tap on what is under it.
 */
export default function NetworkBanner() {
    const isOnline = useIsOnline();
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const [phase, setPhase] = useState<Phase>('hidden');
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
            setPhase('offline-expanded');
            const timer = setTimeout(() => setPhase('offline-collapsed'), OFFLINE_TEXT_MS);
            return () => clearTimeout(timer);
        }
        // Back online: confirm it only if the user saw the offline state.
        if (!wasOfflineRef.current) return;
        wasOfflineRef.current = false;
        setPhase('restored-icon');
        const textTimer = setTimeout(() => setPhase('restored-expanded'), RESTORED_ICON_MS);
        const hideTimer = setTimeout(
            () => setPhase('hidden'),
            RESTORED_ICON_MS + RESTORED_VISIBLE_MS,
        );
        return () => {
            clearTimeout(textTimer);
            clearTimeout(hideTimer);
        };
    }, [isOnline]);

    const visible = !isOnline || phase !== 'hidden';
    // `hidden` while offline is the one render before the effect sets the phase.
    const showText =
        phase === 'offline-expanded' || phase === 'restored-expanded' || (!isOnline && phase === 'hidden');
    const showPulse = !isOnline && phase === 'offline-collapsed' && !reduceMotion;
    const message = isOnline ? t.common.network.restored : t.common.network.offline;
    const offset = reduceMotion ? 0 : -12;
    const foldedWidth = reduceMotion ? 'auto' : 0;

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-[1000000] flex justify-center px-4"
        >
            {/* Announced once per state; folding the visible text changes nothing here. */}
            {visible && <span className="sr-only">{message}</span>}
            <AnimatePresence>
                {visible && (
                    <motion.div
                        key="network-pill"
                        aria-hidden
                        initial={{ opacity: 0, y: offset, scale: reduceMotion ? 1 : 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: offset, scale: reduceMotion ? 1 : 0.9 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                        className={`relative flex max-w-full items-center rounded-full py-xd-7 text-xd-13 font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-[padding,background-color] duration-300 ${
                            showText ? 'px-xd-14' : 'px-xd-7'
                        } ${isOnline ? 'bg-success' : 'bg-error'}`}
                    >
                        {showPulse && (
                            <motion.span
                                className="absolute inset-0 -z-10 rounded-full bg-error"
                                initial={{ opacity: 0.5, scale: 1 }}
                                animate={{ opacity: 0, scale: 1.9 }}
                                transition={{
                                    duration: 1.4,
                                    ease: 'easeOut',
                                    repeat: Infinity,
                                    repeatDelay: 1.6,
                                }}
                            />
                        )}
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={isOnline ? 'restored' : 'offline'}
                                initial={
                                    reduceMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, scale: 0.5, rotate: -30 }
                                }
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                                className="flex shrink-0"
                            >
                                {isOnline ? (
                                    <Wifi className="size-xd-14 shrink-0" strokeWidth={2.5} />
                                ) : (
                                    <WifiOff className="size-xd-14 shrink-0" strokeWidth={2.5} />
                                )}
                            </motion.span>
                        </AnimatePresence>
                        {/* The pill enters whole, so the text only animates when it folds or unfolds. */}
                        <AnimatePresence initial={false}>
                            {showText && (
                                <motion.span
                                    key={isOnline ? 'restored' : 'offline'}
                                    initial={{ width: foldedWidth, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: foldedWidth, opacity: 0 }}
                                    transition={{
                                        width: { type: 'spring', stiffness: 380, damping: 34 },
                                        opacity: { duration: 0.2 },
                                    }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    <span className="block ps-xd-6">{message}</span>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
