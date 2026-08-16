'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { QRCodeDisplay } from '../QR/send/shared/QRCodeDisplay';
import { apiFetch } from '@/core/utils';
import verifiedBigIcon from '@/assets/icons/verification/verified-big.svg';
import ClientInfoSvg from '@/assets/icons/profile/clientinfo.svg';
import notVerifiedIcon from '@/assets/icons/verification/not-verified.svg';
import Image from 'next/image';

interface ClientInformationScreenProps {
    onBack: () => void;
    onShowQR: () => void;
    onShowClientName: () => void;
    onShowPhone: () => void;
    user: {
        id?: string;
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        userType?: string;
        createdAt?: string;
        kycVerification?: { status?: string };
    };
    displayId?: string;
}

function daysSince(dateStr?: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} Day${days !== 1 ? 's' : ''}`;
}

function formatAccountId(num?: string): string {
    if (!num) return '—';
    if (num.length <= 4) return num;
    return num.slice(0, -4).replace(/\d{4}/g, '$&-').replace(/-$/, '') + '-' + num.slice(-4);
}

export default function ClientInformationScreen({
    onBack,
    onShowQR,
    onShowClientName,
    onShowPhone,
    user,
    displayId,
}: ClientInformationScreenProps) {
    // Pull the full KYC record (status + the uploaded ID/face images), which the
    // `user` prop doesn't carry. `/api/kyc/current` returns { kycRequest }.
    const [kyc, setKyc] = useState<{
        status?: string;
        documentType?: string | null;
        documentFrontImageUrl?: string | null;
        documentBackImageUrl?: string | null;
        selfieImageUrl?: string | null;
    } | null>(null);

    useEffect(() => {
        let active = true;
        apiFetch('/api/kyc/current')
            .then((r) => r.json())
            .then((d: Record<string, unknown>) => {
                // NestJS returns { kycRequest: {...} } and the worker wraps it AGAIN,
                // so the payload is double-nested: { kycRequest: { kycRequest: {...} } }.
                // Unwrap however many `kycRequest` layers down to the real record.
                let rec: Record<string, unknown> | null = d ?? null;
                while (
                    rec &&
                    typeof rec.kycRequest === 'object' &&
                    rec.kycRequest !== null
                ) {
                    rec = rec.kycRequest as Record<string, unknown>;
                }
                if (active) setKyc((rec as typeof kyc) ?? null);
            })
            .catch(() => {
                if (active) setKyc(null);
            });
        return () => {
            active = false;
        };
    }, []);

    // Recognise every "verified" spelling the backend may return — the old check
    // missed 'verified' (our actual status), so it always showed "Not Verified".
    const status = (kyc?.status ?? user.kycVerification?.status)?.toLowerCase();
    const isVerified = status === 'verified' || status === 'approved' || status === 'passed';
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

    // Human-readable document type (e.g. "passport" → "Passport", "national_id" → "National ID").
    const docTypeLabel = (() => {
        const t = kyc?.documentType?.toLowerCase();
        if (!t) return undefined;
        if (t.includes('passport')) return 'Passport';
        if (t.includes('id') || t.includes('national')) return 'National ID';
        return t.charAt(0).toUpperCase() + t.slice(1);
    })();

    const InfoRow = ({ label, value }: { label: string; value: string }) => (
        <div className="flex flex-col gap-xd-4">
            <span className="text-xd-11 text-[#8E8E8E] leading-none">{label}</span>
            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">{value}</span>
        </div>
    );

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-10">
                <button
                    onClick={onBack}
                    className="absolute left-xd-20 flex items-center text-[#1D1D1D]"
                >
                    <ChevronLeft className="w-xd-22 h-xd-22" />
                </button>
                <span className="text-xd-16 font-medium text-[#1D1D1D]">Client Information</span>
            </div>

            {/* Content */}
            <div className="flex-1 items-center overflow-y-auto px-xd-12 pt-xd-16 pb-xd-20 flex flex-col gap-xd-4">
                {/* Client ID*/}
                <div className="border border-[#E5E5E5]/50 w-xd-406 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                    <div className="flex flex-col gap-xd-8">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">Client ID</span>
                        <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                            {displayId ? `ID ${displayId}` : '—'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onShowQR}
                        className="relative size-xd-39 shrink-0"
                    >
                        <QRCodeDisplay value={displayId ?? ''} size={39} />
                    </button>
                </div>

                {/* Status + Since */}
                <div className="grid grid-cols-2 w-xd-406 gap-xd-4">
                    {/* Status  */}
                    <div className=" w-xd-201 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                        <div className="flex flex-col gap-xd-8">
                            <span className="text-xd-12 text-[#8D8D8D] leading-none">
                                Client Status
                            </span>
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                Active
                            </span>
                        </div>
                    </div>
                    {/* Since  */}
                    <div className=" w-xd-201 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                        <div className="flex flex-col gap-xd-8">
                            <span className="text-xd-12 text-[#8D8D8D] leading-none">
                                Client Since
                            </span>
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                {daysSince(user.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Type + Verified */}
                <div className="grid grid-cols-2 w-xd-406 gap-xd-4">
                    {/* Status  */}
                    <div className=" w-xd-201 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                        <div className="flex flex-col gap-xd-8">
                            <span className="text-xd-12 text-[#8D8D8D] leading-none">
                                Client Type
                            </span>
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                {user.userType
                                    ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1)
                                    : 'Personal'}
                            </span>
                        </div>
                    </div>
                    {/* Since  */}
                    <div className=" w-xd-201 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                        <div className="flex flex-col gap-xd-8">
                            <span className="text-xd-12 text-[#8D8D8D] leading-none">
                                Client Verified
                            </span>
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                                {isVerified ? 'Verified' : 'Not Verified'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Client Name */}
                <div className="border border-[#E5E5E5]/50 w-xd-406 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                    <div className="flex flex-col gap-xd-8">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">Client Name</span>
                        <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                            {fullName}
                        </span>
                    </div>
                    <span className="relative flex items-end justify-center gap-xd-6 size-xd-39 shrink-0">
                        <Image
                            src={isVerified ? verifiedBigIcon : notVerifiedIcon}
                            alt=""
                            width={18}
                            height={18}
                            className="object-contain size-xd-18"
                        />
                        <Image
                            onClick={onShowClientName}
                            src={ClientInfoSvg}
                            alt=""
                            width={18}
                            height={18}
                            className="object-contain size-xd-18"
                        />
                    </span>
                </div>

                {/* Phone Number */}
                <button
                    type="button"
                    onClick={onShowPhone}
                    className="border border-[#E5E5E5]/50 w-xd-406 bg-[#FCFCFC] h-xd-55 rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between text-left"
                >
                    <div className="flex flex-col gap-xd-8">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">
                            Client Phone Number
                        </span>
                        <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none">
                            {user.phoneNumber ? `+${user.phoneNumber}` : '—'}
                        </span>
                    </div>
                </button>

                {/* KYC Documents (ID + face captured during verification) */}
                {(kyc?.documentFrontImageUrl ||
                    kyc?.documentBackImageUrl ||
                    kyc?.selfieImageUrl) && (
                    <div className="w-xd-406 flex flex-col gap-xd-8 mt-xd-8">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none px-xd-2">
                            Verification Documents{docTypeLabel ? ` · ${docTypeLabel}` : ''}
                        </span>
                        <div className="flex gap-xd-8">
                            {kyc?.documentFrontImageUrl && (
                                <div className="flex flex-col items-center gap-xd-4">
                                    {/* External S3 URL → plain <img> (no next/image domain config) */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={kyc.documentFrontImageUrl}
                                        alt={docTypeLabel ?? 'ID document'}
                                        className="w-xd-120 h-xd-80 rounded-xd-12 object-cover border border-[#E5E5E5]"
                                    />
                                    <span className="text-xd-10 text-[#8E8E8E] leading-none">
                                        {docTypeLabel ?? 'ID'}
                                    </span>
                                </div>
                            )}
                            {kyc?.documentBackImageUrl && (
                                <div className="flex flex-col items-center gap-xd-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={kyc.documentBackImageUrl}
                                        alt="ID back"
                                        className="w-xd-120 h-xd-80 rounded-xd-12 object-cover border border-[#E5E5E5]"
                                    />
                                    <span className="text-xd-10 text-[#8E8E8E] leading-none">
                                        Back
                                    </span>
                                </div>
                            )}
                            {kyc?.selfieImageUrl && (
                                <div className="flex flex-col items-center gap-xd-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={kyc.selfieImageUrl}
                                        alt="Face"
                                        className="w-xd-80 h-xd-80 rounded-xd-12 object-cover border border-[#E5E5E5]"
                                    />
                                    <span className="text-xd-10 text-[#8E8E8E] leading-none">
                                        Face
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Account */}
            <div className="px-xd-20 flex items-center w-full justify-center pb-xd-24">
                <button
                    type="button"
                    className="h-xd-55 w-xd-406 bg-[#FCFCFC] border border-[#C3C3C3]/50 rounded-xd-15 flex items-center justify-center font-medium text-xd-14 text-[#1D1D1D]"
                >
                    Delete My Account Request
                </button>
            </div>
        </div>
    );
}
