import type { Metadata, Viewport } from 'next';
import '@/styles/styles.css';
import { RDBLayout } from '@/components/layout/RDBLayout';
import { AuthProvider } from '@/context/AuthContext';
import { LayoutProvider } from '@/context/LayoutContext';
import { generateThemeVariables } from '@/lib/theme';
import { StoreProvider } from '@/context/StoreContext';
import { I18nProvider } from '@/context/I18nContext';
import { ToastProvider } from '@/context/ToastContext';
import { ScannerProvider } from '@/context/ScannerContext';
import ToastContainer from '@/components/ui/Toast/ToastContainer';
import NetworkBanner from '@/components/layout/NetworkBanner';
import React from 'react';
import { PasskeyProvider } from '@/context/PasskeyContext';
import { Quicksand } from 'next/font/google';
import ProcessEnvLogger from '@/components/debug/ProcessEnvLogger';
import { Observe, ObserveCorrelation } from '@/components/observe/Observe';

/**
 * Global viewport configuration
 */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

/**
 * SEO and Document Metadata
 */
export const metadata: Metadata = {
    title: 'Ramaaz Digital Banking',
    description: 'Ramaaz Digital Banking System',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Ramaaz',
    },
};
const quicksand = Quicksand({
    subsets: ['latin'],
    variable: '--font-quicksand',
});
/**
 * Root Layout Component
 * Provides the global context providers and theme variables to the entire application.
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const themeVariables = generateThemeVariables();

    return (
        <html className={`h-full ${quicksand.variable}`} lang="en" style={themeVariables}>
            <body className="h-full antialiased">
                {/* 0. Observe: installs the error/fetch hooks first, so they are
                    in place before any provider below can throw or call the API */}
                <Observe />
                <ProcessEnvLogger />
                {/* 1. i18n Provider: Language from localStorage (standalone mode) */}
                <I18nProvider>
                    {/* 2. Global Auth State */}
                    <AuthProvider>
                        {/* Labels the Observe session with the user id NestJS also logs */}
                        <ObserveCorrelation />
                        {/* 2b. Passkey Provider: device recognition + lock state machine */}
                        <PasskeyProvider>
                            <StoreProvider>
                                {/* 3. Main UI Shell */}
                                <ScannerProvider>
                                    <RDBLayout>
                                        {/* 4. Feature-specific State Management */}
                                        <LayoutProvider>
                                            <ToastProvider>
                                                {children}
                                                <ToastContainer />
                                                <NetworkBanner />
                                            </ToastProvider>
                                        </LayoutProvider>
                                    </RDBLayout>
                                </ScannerProvider>
                            </StoreProvider>
                        </PasskeyProvider>
                    </AuthProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
