'use client';
import { useEffect, useState, useRef } from 'react';
import { useUniversalRouter } from '@/hooks/useUniversalRouter';
import { useAuth } from '@/context/AuthContext';
import SplashScreen from '@/components/SplashScreen';

export default function RootPage() {
    const router = useUniversalRouter();
    const { userData, isLoading: isAuthLoading } = useAuth();
    const [splashDone, setSplashDone] = useState(false);
    const hasRedirected = useRef(false);
    const routerRef = useRef(router);
    routerRef.current = router;

    // Route by auth state. Going to /home while unauthenticated makes middleware
    // answer the RSC navigation with a 307 to /auth, and the client router keeps
    // that redirect: the post-passcode router.replace('/home') then resolves from
    // it, issues NO request at all, and strands the user on the passcode screen.
    // Measured on the Workers build — two 307s from `/` before login, then zero
    // /home requests after a successful passcode. Locally, entering straight at
    // /auth never poisons it, which is why the freeze never reproduced there.
    // Waiting for isAuthLoading also stops the "logged in" case from bouncing
    // through /auth on every cold start.
    useEffect(() => {
        if (!splashDone || isAuthLoading || hasRedirected.current) return;
        hasRedirected.current = true;
        routerRef.current.replace(userData ? '/home' : '/auth');
    }, [splashDone, isAuthLoading, userData]);

    return <SplashScreen onComplete={() => setSplashDone(true)} />;
}
