'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { RDBActions } from '@/core/types/actions';
import { core as coreActions } from '../core';
import { initialData } from '@/config/runtime';

// const MyToken =
//     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OGUyYTYwNTA1MTU0ZjlmMTRhZmViZCIsImVtYWlsIjoicGhvbmVfOTYzOTgwMDMzNDk2QHRyeWRvcy1vdHAubG9jYWwiLCJ0eXBlIjoidXNlciIsImxhbmciOiJlbiIsImt5Y1N0YXR1cyI6Im5vdF9zdWJtaXR0ZWQiLCJpYXQiOjE3NzEwNzQyMjksImV4cCI6MTc3MzY2NjIyOX0.jeiRwUv9aV2Ks1dvqPjkKy5H8N8VpzO8Fvxbw40Ph_k';

/**
 * Combined Context Interface for RDB
 * Includes both Configuration and Actions
 */
export interface RDBContextValue {
    // Configuration
    baseUrl: string;
    local: string;
    storeKey?: string;
    handleUnauthenticated: () => void;
    /**
     * The cookie name from which the auth token is read server-side.
     * Defaults to 'rdb_at' (the internal secure cookie).
     */
    authCookieName?: string;
    // Actions
    actions?: RDBActions;
}

// Default Configuration (Standalone Fallback)
const defaultConfig: RDBContextValue = {
    baseUrl: initialData.BaseUrl || 'http://localhost:3000',
    local: initialData.Locale || 'gb-en',
    handleUnauthenticated: () => console.warn('[RDB] Unauthenticated (Default Handler)'),
    authCookieName: 'rdb_at',
    actions: undefined,
};

const RDBContext = createContext<RDBContextValue>(defaultConfig);

export const RDBProvider = ({
    children,
    config,
    actions,
}: {
    children: React.ReactNode;
    config?: Partial<Omit<RDBContextValue, 'actions'>>;
    actions?: RDBActions;
}) => {
    const baseUrl = config?.baseUrl ?? defaultConfig.baseUrl;
    const local = config?.local ?? defaultConfig.local;
    const authCookieName = config?.authCookieName ?? defaultConfig.authCookieName;

    const boundActions = useMemo(() => {
        if (actions) return actions;

        const bindModule = (module: any) => {
            const wrapped: Record<string, any> = {};
            Object.keys(module).forEach((fnName) => {
                const fn = (module as any)[fnName];
                if (typeof fn !== 'function') return;
                wrapped[fnName] = (args: any = {}) =>
                    fn({ baseUrl, local, authCookieName, ...args });
            });
            return wrapped;
        };

        return {
            banking: bindModule(coreActions.banking),
            media: bindModule(coreActions.media),
            transactions: bindModule(coreActions.transactions),
            wallets: bindModule(coreActions.wallets),
            auth: bindModule(coreActions.auth),
            paymentRequests: bindModule(coreActions.paymentRequests),
        } as RDBActions;
    }, [actions, baseUrl, local, authCookieName]);

    const contextValue = useMemo<RDBContextValue>(
        () => ({
            ...defaultConfig,
            ...config,
            baseUrl,
            local,
            authCookieName,
            handleUnauthenticated:
                config?.handleUnauthenticated ?? defaultConfig.handleUnauthenticated,
            actions: boundActions,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [boundActions],
    );

    return <RDBContext.Provider value={contextValue}>{children}</RDBContext.Provider>;
};

/**
 * Hook to access the full RDB Context
 */
export const useRDBContext = () => useContext(RDBContext);

/**
 * Helper to access just the configuration
 */
export const useRDBConfig = () => {
    const { actions, ...config } = useContext(RDBContext);
    return config;
};
