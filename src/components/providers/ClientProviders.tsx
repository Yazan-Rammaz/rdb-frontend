'use client';

import React, { useEffect, useState } from 'react';
import { useActions } from '@/hooks/useActions';
import { useRDBConfig } from '@/context/RDBContext';
import { useAuth } from '@/context/AuthContext';
import { usePasskey } from '@/context/PasskeyContext';
import { useStore } from '@/context/StoreContext';
import { useUniversalRouter } from '@/hooks/useUniversalRouter';
import SplashScreen from '@/components/SplashScreen';
import { preloadAuthFlowState } from '@/lib/authFlowCookie';

// Decrypt the auth-flow cookie eagerly (as soon as this module loads) so the
// result is cached before AuthPage mounts after the splash — no flash on
// /auth refresh.
if (typeof window !== 'undefined') {
    preloadAuthFlowState();
}

// Override toLocaleString to use English digits as requested in main.tsx
if (typeof window !== 'undefined') {
    Number.prototype.toLocaleString = function () {
        return this.toString().replace(/\d/g, (d: any) => '0123456789'[d]);
    };
}

export function ClientProviders({
    children,
    onSplashCompleteAction,
}: {
    children: React.ReactNode;
    onSplashCompleteAction?: () => void;
}) {
    const router = useUniversalRouter();
    const actions = useActions();
    const { baseUrl, handleUnauthenticated } = useRDBConfig();
    const { userData, isLoading } = useAuth();
    const { bootReady } = usePasskey();
    const { preloadData, isDataLoaded } = useStore();

    // Splash always runs its full animation on every page reload so the
    // experience is consistent (4 sec on / and /auth alike). It's only skipped
    // for in-tab client navigation since ClientProviders stays mounted.
    const [splashDone, setSplashDone] = useState(false);
    const showSplash = isLoading || !bootReady || !splashDone;

    // Preload data whenever userData becomes available (during splash or after auth)
    // Auth state restoration is handled by AuthProvider (standalone) and RDB.tsx (package)
    useEffect(() => {
        // EXCEPT while on /auth: userData flips right after passcode login, and
        // starting the preload burst here makes its responses land as urgent
        // context updates that keep restarting React's in-progress navigation
        // transition to /home — the transition needs ~450ms uninterrupted, so it
        // never commits and the user freezes on the passcode screen. The
        // protected layout preloads on arrival instead (see PreloadStore).
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
            return;
        }
        if (!isDataLoaded && userData) {
            preloadData(actions, handleUnauthenticated);
        }
    }, [userData, preloadData, actions, handleUnauthenticated, isDataLoaded]);

    return (
        <div
            id="client-providers"
            className="relative bg-background h-full w-full max-h-full max-w-full overflow-hidden flex flex-col shadow-none"
        >
            {showSplash ? (
                <SplashScreen onComplete={() => setSplashDone(true)} />
            ) : (
                children
            )}
        </div>
    );
}
