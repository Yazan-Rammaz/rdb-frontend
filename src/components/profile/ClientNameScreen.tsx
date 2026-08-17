'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import verifiedBigIcon from '@/assets/icons/verification/verified-big.svg';
import warnSvg from '@/assets/icons/profile/warn.svg';
import infoSvg from '@/assets/icons/profile/info.svg';
import { useToast } from '@/context/ToastContext';
import { apiFetch } from '@/core/utils';
import { api } from '@/api';

interface ClientNameScreenProps {
    onBack: () => void;
    onVerifyNow: () => void;
    onSaved?: (name: string) => void;
    fullName: string;
    isVerified: boolean;
}

interface KycDoc {
    documentFrontImageUrl?: string;
    documentBackImageUrl?: string;
    documentFaceImageUrl?: string;
}

export default function ClientNameScreen({
    onBack,
    onVerifyNow,
    onSaved,
    fullName,
    isVerified,
}: ClientNameScreenProps) {
    const { toast } = useToast();
    const [name, setName] = useState(fullName);
    const [saving, setSaving] = useState(false);
    const [docs, setDocs] = useState<KycDoc | null>(null);

    useEffect(() => {
        if (isVerified) {
            apiFetch('/api/kyc/current')
                .then((r) => r.json())
                .then((d) => {
                    const req = d.kycRequest ?? d;
                    setDocs({
                        documentFrontImageUrl: req?.documentFrontImageUrl,
                        documentBackImageUrl: req?.documentBackImageUrl,
                        documentFaceImageUrl: req?.documentFaceImageUrl ?? req?.faceImageUrl,
                    });
                })
                .catch(() => {});
        }
    }, [isVerified]);

    const docImages = [
        docs?.documentFaceImageUrl,
        docs?.documentFrontImageUrl,
        docs?.documentBackImageUrl,
    ].filter(Boolean) as string[];

    const handleSave = async () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

        setSaving(true);
        try {
            const res = await api.profile.update(
                lastName ? { firstName, lastName } : { firstName },
            );
            if (res.ok) {
                onSaved?.(trimmed);
                toast.success('Name updated successfully');
            } else {
                // The server's own message beats a generic string — a 429 or a
                // validation failure now says what actually went wrong.
                toast.error(res.error.message);
            }
            onBack();
        } catch {
            toast.error('Failed to update name');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-10 border-b border-[#f0f0f0]">
                <button
                    onClick={onBack}
                    className="absolute left-xd-20 flex items-center text-[#1D1D1D]"
                >
                    <ChevronLeft className="w-xd-22 h-xd-22" />
                </button>
                <span className="text-xd-16 font-medium text-[#1D1D1D]">Client Name</span>
            </div>

            <div className="flex-1 overflow-y-auto px-xd-12 pt-xd-16 pb-xd-20 flex flex-col gap-xd-10 items-center">
                {/* Name field */}
                <div className="border border-[#C3C3C3]/50 w-xd-406 bg-[#FFFFFF] rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                    <div className="flex flex-col gap-xd-6 flex-1">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">Client Name</span>
                        {isVerified ? (
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none py-xd-4">
                                {fullName}
                            </span>
                        ) : (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-xd-14 text-[#1D1D1D] font-medium leading-none bg-transparent outline-none w-full"
                            />
                        )}
                    </div>
                    {isVerified && (
                        <div className="relative size-xd-18 shrink-0">
                            <Image src={verifiedBigIcon} alt="" fill className="object-contain" />
                        </div>
                    )}
                </div>

                {/* Warning / info box */}
                {isVerified ? (
                    <div className="w-xd-406 bg-[#FFFBEB] rounded-xd-15 px-xd-12 py-xd-10 flex items-start gap-xd-8">
                        <div className="relative size-xd-14 shrink-0 mt-xd-2">
                            <Image src={warnSvg} alt="" fill className="object-contain" />
                        </div>
                        <div className="flex flex-col gap-xd-4">
                            <span className="font-bold text-xd-12 text-[#8D8D8D] leading-tight">
                                Client Name Cannot Be Changed
                            </span>
                            <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                                Because It Is Linked To The Documents You Submitted
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="w-xd-406 bg-[#F2FFF0] rounded-xd-15 px-xd-12 py-xd-10 flex items-start gap-xd-8">
                        <div className="relative size-xd-14 shrink-0 mt-xd-2">
                            <Image src={warnSvg} alt="" fill className="object-contain" />
                        </div>
                        <div className="flex flex-col gap-xd-4">
                            <span className="font-medium text-xd-11 text-[#8D8D8D] leading-tight">
                                The Name Must Match The Personal Identification
                            </span>
                            <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                                To Guarantee Ownership Of The Funds In The Account. Also, When
                                Receiving Any Money From The Centers, It Will Not Be Released Except
                                Upon Presentation Of A Matching Official Document.
                            </span>
                        </div>
                    </div>
                )}

                {/* Not verified: KYC banners (same design as settings page) */}
                {!isVerified && (
                    <>
                        {/* Unprotected banner */}
                        <div className="w-xd-406 flex items-center justify-between bg-[#FFF9F0] rounded-xl p-xd-12 h-xd-58 gap-xd-10">
                            <div className="flex items-center gap-xd-10 flex-1 min-w-0">
                                <div className="flex flex-col gap-xd-5 min-w-0">
                                    <span className="flex items-center gap-xd-6 leading-none">
                                        <div className="relative size-xd-14 shrink-0">
                                            <Image
                                                src={warnSvg}
                                                alt=""
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                        <span className="font-medium text-[#1D1D1D] text-xd-11 leading-none">
                                            Unprotected Account | Limited Access
                                        </span>
                                    </span>
                                    <span className="text-[#1D1D1D] pl-xd-20 font-medium text-xd-11 leading-tight truncate">
                                        Weekly Transaction Volume{' '}
                                        <span className="font-bold text-[#1D1D1D]">60/15 USD</span>{' '}
                                        | Renew Fri 10:00
                                    </span>
                                </div>
                            </div>
                            <div className="relative size-xd-14 shrink-0">
                                <Image src={infoSvg} alt="" fill className="object-contain" />
                            </div>
                        </div>

                        {/* Protect banner */}
                        <div className="w-xd-406 flex flex-col h-xd-108 items-center justify-between bg-[#F0F6FD] rounded-xd-15 p-xd-12 gap-xd-12">
                            <div className="flex w-full items-center">
                                <div className="flex items-center gap-xd-10 flex-1 min-w-0">
                                    <div className="flex flex-col gap-xd-5 min-w-0">
                                        <div className="flex w-full gap-xd-6 items-center">
                                            <div className="relative size-xd-14 shrink-0">
                                                <Image
                                                    src={verifiedBigIcon}
                                                    alt=""
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="font-medium text-[#1D1D1D] text-xd-11 leading-none">
                                                Protect Your Account | Full Access
                                            </span>
                                        </div>
                                        <span className="text-[#1D1D1D] pl-xd-20 text-xd-11 leading-tight">
                                            Keep Your Account Secure, Ensures Safe Transactions.
                                        </span>
                                    </div>
                                </div>
                                <div className="relative size-xd-14 shrink-0">
                                    <Image src={infoSvg} alt="" fill className="object-contain" />
                                </div>
                            </div>
                            {/* Protect & Verify Now button */}
                            <button
                                type="button"
                                onClick={onVerifyNow}
                                className="flex items-center justify-center gap-xd-6 h-xd-38 w-xd-382 rounded-xl bg-[#E0EDFF] text-[#1D1D1D] font-medium text-xd-11"
                            >
                                <div className="relative size-xd-14">
                                    <Image
                                        src={verifiedBigIcon}
                                        alt=""
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                Protect &amp; Verify Now
                            </button>
                        </div>
                    </>
                )}

                {/* Verified: show uploaded documents */}
                {isVerified && docImages.length > 0 && (
                    <div className="w-xd-406 flex flex-col gap-xd-10">
                        <span className="text-xd-13 font-medium text-[#1D1D1D]">
                            Client Uploaded Documents
                        </span>
                        <span className="text-xd-12 text-[#8D8D8D]">Your Files</span>
                        <div className="flex gap-xd-8 flex-wrap">
                            {docImages.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt={`Document ${i + 1}`}
                                    className="h-xd-80 w-xd-120 object-cover rounded-xd-10 border border-[#E5E5E5]"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom */}
            <div className="px-xd-12 pb-xd-24 flex items-center justify-center">
                {isVerified ? (
                    <button type="button" className="text-xd-13 text-[#3066CC]">
                        Need Help About My Name
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-xd-406 h-xd-44 rounded-xd-15 bg-[#3066CC] text-white font-medium text-xd-13 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                )}
            </div>
        </div>
    );
}
