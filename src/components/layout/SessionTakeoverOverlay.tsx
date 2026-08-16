'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { FlexibleSpace } from '@/scaling';
import verifiedIcon from '@/assets/icons/verification/verified-big.svg';
import notVerifiedIcon from '@/assets/icons/verification/not-verified.svg';

/**
 * Shown (instead of an immediate redirect) when THIS web session is replaced by a
 * newer web login (`session:revoked_by_new_login`). Mirrors the LOCKED lock-screen
 * design exactly, but swaps the PIN inputs for a "You Have Logged In Via The Web
 * X Ago" line — web cannot reclaim a revoked session, so there is no action to
 * take. The session is dead server-side, so the moment the user refreshes the
 * normal auth check sends them to the Get Started page.
 *
 * @param since epoch ms when the new login arrived over the websocket — drives the
 *              live "X ago" label.
 */
export default function SessionTakeoverOverlay({ since }: { since: number }) {
    const { userData } = useAuth();
    const user = userData?.user ?? userData;

    const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        user?.kycRequest?.fullName ||
        'User';
    const avatarUrl = user?.profilePictureURL;
    const kycSt = user?.kycVerification?.status?.toLowerCase();
    const isVerified = kycSt === 'verified' || kycSt === 'approved' || kycSt === 'passed';

    // Live "X ago" label, refreshed every 30s.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    const { amount, suffix } = formatAgo(Date.now() - since);

    return (
        <div className="fixed inset-0 z-[200] w-full h-full overflow-hidden bg-white">
            {/* Layer 1 — avatar, painted before the blur so backdrop-blur blurs it */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none">
                <div className=" mb-xd-370">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt=""
                            className="w-xd-194 h-xd-190 rounded-xd-15 object-cover"
                        />
                    ) : (
                        <div className="w-xd-194 h-xd-190 rounded-xd-15 bg-gray-400 flex items-center justify-center">
                            <span className="text-white font-bold" style={{ fontSize: 64 }}>
                                {(displayName ?? '?')[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Layer 2 — blur + tint, blurs avatar and page behind */}
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/20 pointer-events-none" />

            {/* Layer 3 — content, above blur */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <div
                    style={{ marginTop: 'calc(100 * var(--xd-unit))' }}
                    className="flex flex-col items-center gap-xd-5"
                >
                    {/* Verified badge */}
                    <Image
                        src={isVerified ? verifiedIcon : notVerifiedIcon}
                        alt={isVerified ? 'Verified' : 'Not Verified'}
                        width={23}
                        height={23}
                        className="object-contain"
                    />

                    {/* Name */}
                    {displayName && (
                        <p className="text-xd-18 text-[#1D1D1D] mb-xd-14">{displayName}</p>
                    )}

                    {/* "Logged in via web" line — replaces the PIN inputs */}
                    <p className="text-xd-12 font-normal text-[#388CFF] mb-xd-3 text-center">
                        You Have Logged In Via The Web <span className="font-bold">{amount}</span>
                        {suffix ? ` ${suffix}` : ''}
                    </p>

                    <FlexibleSpace size={60} />
                </div>
            </div>
        </div>
    );
}

/**
 * Splits the elapsed time into a bold `amount` and a regular `suffix`, e.g.
 * "Just Now" → { amount: 'Just Now', suffix: '' },
 * "1 Minute" + "Ago" → { amount: '1 Minute', suffix: 'Ago' }.
 */
function formatAgo(elapsedMs: number): { amount: string; suffix: string } {
    const mins = Math.floor(elapsedMs / 60_000);
    if (mins < 1) return { amount: 'Just Now', suffix: '' };
    if (mins < 60) return { amount: `${mins} Minute${mins === 1 ? '' : 's'}`, suffix: 'Ago' };
    const hours = Math.floor(mins / 60);
    return { amount: `${hours} Hour${hours === 1 ? '' : 's'}`, suffix: 'Ago' };
}
