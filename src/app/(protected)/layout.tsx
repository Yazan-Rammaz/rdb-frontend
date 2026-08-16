'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRDBConfig } from '../../context/RDBContext';
import { useStore } from '../../context/StoreContext';
import { AuthProtected, useAuth } from '../../context/AuthContext';
import Footer from '../../components/layout/Footer';
import Header from '../../components/layout/Header';
import GlobalQrScanner from '../../components/QR/scanner/GlobalQrScanner';
import PasskeyGate from '../../components/layout/PasskeyGate';
import { SessionTakeoverProvider } from '../../context/SessionTakeoverContext';
import { WSProvider } from '../../context/WSContext';
import { FaceReverifyProvider } from '../../context/FaceReverifyContext';
import FaceReverifyOverlay from '../../components/faceReverify/FaceReverifyOverlay';
import { ResetPasscodeProvider } from '../../context/ResetPasscodeContext';
import ResetPasscodeOverlay from '../../components/resetPasscode/ResetPasscodeOverlay';

/**
 * Starts the store preload once a protected route has actually mounted.
 * Deliberately NOT started from /auth during login: the preload responses land
 * as urgent context updates that keep restarting the /auth → /home navigation
 * transition, starving it so the login freezes on the passcode screen.
 * preloadData is idempotent (isDataLoaded + preloadStartedRef guards), so this
 * is a no-op when ClientProviders already preloaded during the splash.
 *
 * refreshUser() lives here for the same reason: it used to run inline in
 * handlePasscodeSuccess right before the /auth → /home navigation, and its /me
 * response landing mid-transition could starve the navigation the same way —
 * the /home request was never even issued. Running it only after we've
 * actually mounted a protected route removes that race entirely.
 */
function PreloadStore() {
    const { handleUnauthenticated } = useRDBConfig();
    const { preloadData, isDataLoaded } = useStore();
    const { refreshUser } = useAuth();

    useEffect(() => {
        if (!isDataLoaded) {
            void preloadData(handleUnauthenticated);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataLoaded]);

    useEffect(() => {
        refreshUser().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === '/home';

    return (
        <AuthProtected>
            <PreloadStore />
            <ResetPasscodeProvider>
            <SessionTakeoverProvider>
            <PasskeyGate>
                <WSProvider>
                <FaceReverifyProvider>
                <div className="flex flex-col h-full w-full">
                    <Header />
                    <main className="flex-1 overflow-y-auto max-w-full flex flex-col items-center">
                        <div className={`w-full h-full flex flex-col${isHome ? '' : ''}`}>
                            {children}
                        </div>
                    </main>
                    <Footer />
                    <GlobalQrScanner />
                </div>
                <FaceReverifyOverlay />
                </FaceReverifyProvider>
                </WSProvider>
            </PasskeyGate>
            </SessionTakeoverProvider>
            <ResetPasscodeOverlay />
            </ResetPasscodeProvider>
        </AuthProtected>
    );
}
