import React from 'react';
import { ClientProviders } from '@/components/providers/ClientProviders';

export const RDBLayout = ({
    children,
    onSplashCompleteAction,
}: {
    children: React.ReactNode;
    onSplashCompleteAction?: () => void;
}) => {
    return (
        <div className="antialiased h-full">
            <ClientProviders onSplashCompleteAction={onSplashCompleteAction}>
                {children}
            </ClientProviders>
        </div>
    );
};
