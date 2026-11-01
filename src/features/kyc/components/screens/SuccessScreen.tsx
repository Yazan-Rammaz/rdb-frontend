'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/features/kyc/ui/Icon';
import { useVerification } from '@/features/kyc/context/VerificationContext';
import { useKycSession } from '@/features/kyc/context/KycSessionContext';
import { api } from '@/api';
import { KycVerificationStatus } from '@/core/types/auth';

// XD px -> scaling rem.
const rem = (px: number) => `calc(${px} * var(--kyc-px, 1px))`;

/** How long the result stays up before rdb returns home. */
const HOME_AFTER_MS = 5000;

/**
 * Enrolment complete — root's screen, rdb's behaviour.
 *
 * Unlike root's pre-provisioned admins, the person verifying here IS the
 * signed-in user and their account may have no name yet. So, as rdb always
 * did: write the name read off the ID onto an account that has none (never
 * over an existing one), flip the verification badge optimistically, reconcile
 * with the server a beat later, and go home.
 */
export default function SuccessScreen() {
    const { markCompleted, idDocument } = useVerification();
    const { userData, refreshUser, updateUser } = useKycSession();
    const router = useRouter();

    const fullName =
        idDocument?.name?.trim() ||
        [userData?.user?.firstName, userData?.user?.lastName].filter(Boolean).join(' ').trim();

    useEffect(() => {
        let cancelled = false;
        let reconcile: ReturnType<typeof setTimeout> | null = null;
        void (async () => {
            const user = userData?.user;
            if (!user) {
                await refreshUser();
                return;
            }
            const verifiedName = idDocument?.name?.trim();
            let { firstName, lastName } = user;
            if (verifiedName && !(user.firstName || user.lastName)) {
                const parts = verifiedName.split(/s+/);
                firstName = parts[0] ?? '';
                lastName = parts.slice(1).join(' ');
                const res = await api.profile.update(lastName ? { firstName, lastName } : { firstName });
                if (!res.ok) console.warn('[SuccessScreen] name write failed:', res.error.message);
            }
            if (cancelled) return;
            await updateUser({
                ...user,
                firstName,
                lastName,
                kycVerification: { ...user.kycVerification, status: KycVerificationStatus.VERIFIED },
            });
            reconcile = setTimeout(() => {
                if (!cancelled) void refreshUser();
            }, 3000);
        })();
        const home = setTimeout(() => router.push('/home'), HOME_AFTER_MS);
        return () => {
            cancelled = true;
            clearTimeout(home);
            if (reconcile) clearTimeout(reconcile);
        };
        // Once, on arrival.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        markCompleted('success');
    }, [markCompleted]);

    return (
        <div className="flex h-full flex-col items-center justify-center px-24">
            <h1 className="fz-30 text-center leading-none font-bold text-[#1D1D1D]">
                Success Verification !
            </h1>

            <p
                className="fz-14 text-center leading-none font-normal text-[#707070]"
                style={{ marginTop: rem(12) }}
            >
                You Have Enjoy With Our Full Access
            </p>

            <div style={{ marginTop: rem(32) }}>
                <Icon name="kyc/verified" width={150} height={150} alt="" />
            </div>

            {/* Absent until the backend returns it on the face-check response —
                better a clean gap than a placeholder that is not this person. */}
            {fullName ? (
                <p
                    className="fz-14 text-center leading-none font-normal text-[#1D1D1D]"
                    style={{ marginTop: rem(24) }}
                >
                    {fullName}
                </p>
            ) : null}
        </div>
    );
}
