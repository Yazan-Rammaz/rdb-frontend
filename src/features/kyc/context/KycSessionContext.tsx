'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * The signed-in user, as the ported screens read it (`userData.user`).
 *
 * Root keeps its session server-side and handed it down through a provider;
 * rdb already holds the user client-side in AuthContext, so this simply reads
 * that. The provider is kept as a pass-through so screen code stays identical
 * to root's.
 */
export function KycSessionProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function useKycSession() {
    const { userData, refreshUser, updateUser } = useAuth();
    return { userData, refreshUser, updateUser };
}
