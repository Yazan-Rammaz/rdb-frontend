'use client';

import { useEffect, useRef, useState } from 'react';
import { useWS } from '@/context/WSContext';
import type { ConnectionState } from '@/core/types/websocket';

type DotPhase = 'red' | 'orange' | 'green' | 'hidden';

const DOT_COLORS: Record<Exclude<DotPhase, 'hidden'>, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-400',
    green: 'bg-green-500',
};

const DOT_VISIBLE_MS = 1000;
const DOT_DELAY_MS = 8000;

export default function WSStatusDot() {
    const { connectionState } = useWS();
    const [phase, setPhase] = useState<DotPhase>('hidden');

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // track whether we went offline so WS state changes are contextual
    const wasOfflineRef = useRef(false);
    // track whether orange is currently showing (waiting for WS)
    const waitingForWSRef = useRef(false);

    const clearHide = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    // ── Browser offline / online events ───────────────────────────────────
    useEffect(() => {
        const handleOffline = () => {
            wasOfflineRef.current = true;
            waitingForWSRef.current = false;
            clearHide();
            // Wait 5s then show red for 2s
            hideTimerRef.current = setTimeout(() => {
                setPhase('red');
                hideTimerRef.current = setTimeout(() => setPhase('hidden'), DOT_VISIBLE_MS);
            }, DOT_DELAY_MS);
        };

        const handleOnline = () => {
            if (!wasOfflineRef.current) return;
            clearHide();
            // Show orange and keep it until WS reconnects (handled in WS effect below)
            hideTimerRef.current = setTimeout(() => {
                setPhase('orange');
                hideTimerRef.current = setTimeout(() => setPhase('hidden'), DOT_VISIBLE_MS);
                waitingForWSRef.current = true;
            }, DOT_DELAY_MS);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            clearHide();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── React to WS state changes ─────────────────────────────────────────
    const prevWSStateRef = useRef<ConnectionState | null>(null);
    useEffect(() => {
        const prev = prevWSStateRef.current;
        prevWSStateRef.current = connectionState;

        if (connectionState === 'AUTHENTICATED' && wasOfflineRef.current) {
            // WS reconnected after being offline
            clearHide();
            waitingForWSRef.current = false;
            wasOfflineRef.current = false;
            hideTimerRef.current = setTimeout(() => {
                setPhase('green');
                hideTimerRef.current = setTimeout(() => setPhase('hidden'), DOT_VISIBLE_MS);
                return;
            }, DOT_DELAY_MS);
        }

        if (connectionState === 'ERROR' && prev !== 'ERROR' && wasOfflineRef.current) {
            // WS exhausted all retries — reload
            waitingForWSRef.current = false;
            wasOfflineRef.current = false;
            setPhase('hidden');
            window.location.reload();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionState]);

    if (phase === 'hidden') return null;

    return (
        <span
            className={`absolute top-7.5 left-2 w-2 h-2 rounded-full ${DOT_COLORS[phase]}`}
            aria-hidden="true"
        />
    );
}
