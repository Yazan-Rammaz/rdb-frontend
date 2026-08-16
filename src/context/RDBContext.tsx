'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { initialData } from '@/config/runtime';

/**
 * App-wide configuration.
 *
 * This used to carry a bound `actions` object too — every core action wrapped so
 * a host app could inject its own Server Actions. That existed for the npm
 * library build, which is gone, and every call now goes through `@/api`, so all
 * that remains is configuration.
 */
export interface RDBContextValue {
    baseUrl: string;
    local: string;
    storeKey?: string;
    handleUnauthenticated: () => void;
    /**
     * Cookie the auth token is read from, server-side. Defaults to the internal
     * httpOnly `rdb_at`; the browser never reads it.
     */
    authCookieName?: string;
}

const defaultConfig: RDBContextValue = {
    baseUrl: initialData.BaseUrl || 'http://localhost:3000',
    local: initialData.Locale || 'gb-en',
    handleUnauthenticated: () => console.warn('[RDB] Unauthenticated (Default Handler)'),
    authCookieName: 'rdb_at',
};

const RDBContext = createContext<RDBContextValue>(defaultConfig);

export const RDBProvider = ({
    children,
    config,
}: {
    children: React.ReactNode;
    config?: Partial<RDBContextValue>;
}) => {
    const contextValue = useMemo<RDBContextValue>(
        () => ({
            ...defaultConfig,
            ...config,
            handleUnauthenticated:
                config?.handleUnauthenticated ?? defaultConfig.handleUnauthenticated,
        }),
        [config],
    );

    return <RDBContext.Provider value={contextValue}>{children}</RDBContext.Provider>;
};

export const useRDBContext = () => useContext(RDBContext);

/**
 * Kept as a separate hook from `useRDBContext` because it used to strip the
 * `actions` object off the value. They are now identical; both are retained so
 * the ~3 call sites reading config do not need touching.
 */
export const useRDBConfig = () => useContext(RDBContext);
