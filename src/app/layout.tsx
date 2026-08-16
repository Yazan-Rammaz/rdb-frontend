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
import React from 'react';
import { PasskeyProvider } from '@/context/PasskeyContext';
import { Quicksand } from 'next/font/google';
import ProcessEnvLogger from '@/components/debug/ProcessEnvLogger';

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
                <ProcessEnvLogger />
                {/* 1. i18n Provider: Language from localStorage (standalone mode) */}
                <I18nProvider>
                    {/* 2. Global Auth State */}
                    <AuthProvider>
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
