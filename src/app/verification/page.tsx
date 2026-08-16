'use client';

import React from 'react';
import { AuthProtected } from '@/context/AuthContext';
import PasskeyGate from '@/components/layout/PasskeyGate';
import { VerificationProvider } from '@/context/VerificationContext';
import VerificationPage from '@/components/verification/VerificationPage';

export default function VerificationRoute() {
    return (
        // <AuthProtected>
        //     <PasskeyGate>
        <VerificationProvider>
            <VerificationPage />
        </VerificationProvider>
        //     </PasskeyGate>
        // </AuthProtected>
    );
}
