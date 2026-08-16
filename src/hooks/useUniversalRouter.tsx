'use client';

import { useContext, createContext } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import { useNavigate } from 'react-router-dom';
import { useRDBConfig } from '../context/RDBContext';

// Define a unified Router interface
interface UniversalRouter {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
}

const UniversalRouterContext = createContext<UniversalRouter | null>(null);

export const useUniversalRouter = () => {
    const context = useContext(UniversalRouterContext);
    const { isLibrary } = useRDBConfig();

    // Always call useNextRouter unconditionally to satisfy React's rules of hooks.
    // In library mode (React Router), we wrap it in try-catch since Next.js router
    // context won't exist. The result is ignored in library mode.
    let nextRouter: ReturnType<typeof useNextRouter> | null = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        nextRouter = useNextRouter();
    } catch {
        // Expected in library mode where Next.js router context doesn't exist
    }

    // If we are in library mode, use the context provided by LibraryRouterAdapter (React Router)
    if (isLibrary) {
        if (!context) {
            // Fallback to a dummy implementation to prevent crash
            return { push: () => {}, replace: () => {}, back: () => {} };
        }
        return context;
    }

    // In Standalone/Next.js mode, use Next Router directly as a fallback
    return context || nextRouter!;
};

// Adapter for Next.js (to be used in Layout or App wrapper)
export const NextRouterAdapter = ({ children }: { children: React.ReactNode }) => {
    const router = useNextRouter();

    const value = {
        push: (href: string) => router.push(href),
        replace: (href: string) => router.replace(href),
        back: () => router.back(),
    };

    return (
        <UniversalRouterContext.Provider value={value}>{children}</UniversalRouterContext.Provider>
    );
};

export const LibraryRouterAdapter = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();

    const value = {
        push: (href: string) => navigate(href),
        replace: (href: string) => navigate(href, { replace: true }),
        back: () => navigate(-1),
    };

    return (
        <UniversalRouterContext.Provider value={value}>{children}</UniversalRouterContext.Provider>
    );
};
