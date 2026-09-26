'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { networkStatus } from '@/lib/networkStatus';

/**
 * Whether the app can reach its origin. `true` on the server and during
 * hydration so the first client render always matches the HTML.
 */
export function useIsOnline(): boolean {
    return useSyncExternalStore(networkStatus.subscribe, networkStatus.getSnapshot, () => true);
}

/**
 * Run `callback` each time the app goes from offline back to online. For
 * idempotent loads (GETs) that should simply resume — never for a request that
 * changes anything on the server.
 */
export function useOnReconnect(callback: () => void): void {
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        let wasOnline = networkStatus.getSnapshot();
        return networkStatus.subscribe(() => {
            const nowOnline = networkStatus.getSnapshot();
            if (nowOnline && !wasOnline) callbackRef.current();
            wasOnline = nowOnline;
        });
    }, []);
}
