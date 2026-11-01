'use client';

import React from 'react';
import { VerificationProvider } from '@/features/kyc/context/VerificationContext';
import VerificationPage from '@/features/kyc/components/VerificationPage';

/**
 * KYC enrolment — the root dashboard's verification screens (AWS Face
 * Liveness, the light gate, the document scanner) on rdb's backend. See
 * `src/features/kyc/components/VerificationPage.tsx`.
 */
export default function VerificationRoute() {
    return (
        <VerificationProvider initialStep="intro">
            <VerificationPage />
        </VerificationProvider>
    );
}
