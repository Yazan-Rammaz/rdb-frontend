'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { useIsOnline } from '@/hooks/useIsOnline';

const RESTORED_VISIBLE_MS = 2000;

/**
 * The app's only "no connection" message. A pill floating at the top centre:
 * red while the origin is unreachable, green for two seconds once it answers
 * again. Screens stay silent about network failures and disable their network
 * actions instead — this is what explains the disabled state.
 *
 * Fixed and out of the layout flow, so it never moves anything; the wrapper
 * takes no pointer events, so it never swallows a tap on what is under it.
 */
export default function NetworkBanner() {
    const isOnline = useIsOnline();
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const [showRestored, setShowRestored] = useState(false);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
            setShowRestored(false);
            return;
        }
        // Back online: confirm it only if the user saw the offline state.
        if (!wasOfflineRef.current) return;
        wasOfflineRef.current = false;
        setShowRestored(true);
        const timer = setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS);
        return () => clearTimeout(timer);
    }, [isOnline]);

    const visible = !isOnline || showRestored;
    const offset = reduceMotion ? 0 : -12;

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-[1000000] flex justify-center px-4"
        >
            <AnimatePresence>
                {visible && (
                    <motion.div
                        key="network-pill"
                        layout
                        initial={{ opacity: 0, y: offset }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: offset }}
                        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                        className={`flex max-w-full items-center gap-xd-6 rounded-full px-xd-14 py-xd-7 text-xd-13 font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-colors duration-300 ${
                            isOnline ? 'bg-success' : 'bg-error'
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={isOnline ? 'restored' : 'offline'}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-xd-6 whitespace-nowrap"
                            >
                                {isOnline ? (
                                    <Wifi aria-hidden className="size-xd-14 shrink-0" strokeWidth={2.5} />
                                ) : (
                                    <WifiOff aria-hidden className="size-xd-14 shrink-0" strokeWidth={2.5} />
                                )}
                                {isOnline ? t.common.network.restored : t.common.network.offline}
                            </motion.span>
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
