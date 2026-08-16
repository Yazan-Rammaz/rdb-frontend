'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePasskey } from '@/context/PasskeyContext';
import { useRouter } from 'next/navigation';

/**
 * AuthProtected — wraps all protected routes.
 * Waits for both AuthContext (cookie fetch) and PasskeyContext (device boot)
 * to finish before deciding whether to render or redirect.
 *
 * Lock/PIN enforcement is handled exclusively by PasskeyGate, which renders
 * immediately after this component in the protected layout.
 */
export function AuthProtected({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { userData, checkAuth, isLoading } = useAuth();
    const { bootReady } = usePasskey();
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        // Wait for both AuthProvider cookie-fetch and PasskeyProvider boot to complete
        if (isLoading || !bootReady) return;

        const verifyAuth = async () => {
            const authenticated = await checkAuth();
            if (!authenticated || !userData) {
                router.push('/auth');
                return;
            }
            setIsVerified(true);
        };

        verifyAuth();
    }, [userData, router, checkAuth, isLoading, bootReady]);

    // Splash screen (PasskeyContext BOOTING / ClientProviders) is visible beneath,
    // so the user always sees the splash — never a blank or empty screen.
    if (isLoading || !bootReady || !isVerified || !userData) {
        return null;
    }

    return <>{children}</>;
}
