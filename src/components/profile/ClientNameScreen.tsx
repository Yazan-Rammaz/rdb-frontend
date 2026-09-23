'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import verifiedBigIcon from '@/assets/icons/verification/verified-big.svg';
import warnSvg from '@/assets/icons/profile/warn.svg';
import infoSvg from '@/assets/icons/profile/info.svg';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/I18nContext';
import { unwrapKycRequest } from '@/api/helpers/kyc';
import { api } from '@/api';
import {
    NAME_MAX_LENGTH,
    type NameIssue,
    nameIssue,
    normalizeName,
} from '@/lib/nameValidation';

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
    const { t, tr, rtl } = useTranslation();
    const nameErrors: Record<NameIssue, string> = {
        empty: t.auth.enterName.errors.tooShort,
        'invalid-chars': t.auth.enterName.errors.invalidChars,
        'too-short': t.auth.enterName.errors.tooShort,
        'too-long': t.auth.enterName.errors.tooLong,
    };
    const [name, setName] = useState(fullName);
    const [saving, setSaving] = useState(false);
    const [docs, setDocs] = useState<KycDoc | null>(null);

    useEffect(() => {
        if (isVerified) {
            api.kyc.current().then((res) => {
                if (!res.ok) return;
                // Was `d.kycRequest ?? d`, which stops one layer short of the
                // record — the payload is double-wrapped, so every URL below
                // read undefined off the inner wrapper.
                const req = (unwrapKycRequest(res.data) ?? {}) as Record<string, string>;
                setDocs({
                    documentFrontImageUrl: req.documentFrontImageUrl,
                    documentBackImageUrl: req.documentBackImageUrl,
                    documentFaceImageUrl: req.documentFaceImageUrl ?? req.faceImageUrl,
                });
            });
        }
    }, [isVerified]);

    const docImages = [
        docs?.documentFaceImageUrl,
        docs?.documentFrontImageUrl,
        docs?.documentBackImageUrl,
    ].filter(Boolean) as string[];

    const handleSave = async () => {
        // Same field, same endpoint as the sign-up screen — validating only
        // there would leave the identical hole one screen away. Returns before
        // `onBack()` below, so the user stays on the field they have to fix;
        // an empty value used to return silently, with Save doing nothing.
        const issue = nameIssue(name);
        if (issue) {
            toast.error(nameErrors[issue]);
            return;
        }

        const trimmed = normalizeName(name);
        const parts = trimmed.split(' ');
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

        setSaving(true);
        try {
            const res = await api.profile.update(
                lastName ? { firstName, lastName } : { firstName },
            );
            if (res.ok) {
                onSaved?.(trimmed);
                toast.success(t.profile.clientName.updateSuccess);
            } else {
                // The server's own message beats a generic string — a 429 or a
                // validation failure now says what actually went wrong.
                toast.error(res.error.message);
            }
            onBack();
        } catch {
            toast.error(t.profile.clientName.updateFailed);
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
                    aria-label={t.common.accessibility.back}
                    className="absolute start-xd-20 flex items-center text-[#1D1D1D]"
                >
                    {rtl ? (
                        <ChevronRight className="w-xd-22 h-xd-22" />
                    ) : (
                        <ChevronLeft className="w-xd-22 h-xd-22" />
                    )}
                </button>
                <span className="text-xd-16 font-medium text-[#1D1D1D]">
                    {t.profile.clientName.title}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-xd-12 pt-xd-16 pb-xd-20 flex flex-col gap-xd-10 items-center">
                {/* Name field */}
                <div className="border border-[#C3C3C3]/50 w-xd-406 bg-[#FFFFFF] rounded-xd-15 px-xd-12 pt-xd-7 pb-xd-8 flex items-center justify-between">
                    <div className="flex flex-col gap-xd-6 flex-1">
                        <span className="text-xd-12 text-[#8D8D8D] leading-none">
                            {t.profile.clientName.label}
                        </span>
                        {isVerified ? (
                            <span className="text-xd-14 text-[#1D1D1D] font-medium leading-none py-xd-4">
                                {fullName}
                            </span>
                        ) : (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                dir="auto"
                                autoComplete="name"
                                maxLength={NAME_MAX_LENGTH}
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
                                {t.profile.clientName.cannotChangeTitle}
                            </span>
                            <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                                {t.profile.clientName.cannotChangeDesc}
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
                                {t.profile.clientName.mustMatchTitle}
                            </span>
                            <span className="text-xd-11 text-[#8D8D8D] leading-tight">
                                {t.profile.clientName.mustMatchDesc}
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
                                            {t.profile.clientName.unprotectedTitle}
                                        </span>
                                    </span>
                                    <span className="text-[#1D1D1D] ps-xd-20 font-medium text-xd-11 leading-tight truncate">
                                        {tr('profile.clientName.weeklyVolume', {
                                            amount: '60/15 USD',
                                        })}
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
                                                {t.profile.clientName.protectTitle}
                                            </span>
                                        </div>
                                        <span className="text-[#1D1D1D] ps-xd-20 text-xd-11 leading-tight">
                                            {t.profile.clientName.protectDesc}
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
                                {t.profile.clientName.protectButton}
                            </button>
                        </div>
                    </>
                )}

                {/* Verified: show uploaded documents */}
                {isVerified && docImages.length > 0 && (
                    <div className="w-xd-406 flex flex-col gap-xd-10">
                        <span className="text-xd-13 font-medium text-[#1D1D1D]">
                            {t.profile.clientName.uploadedDocuments}
                        </span>
                        <span className="text-xd-12 text-[#8D8D8D]">
                            {t.profile.clientName.yourFiles}
                        </span>
                        <div className="flex gap-xd-8 flex-wrap">
                            {docImages.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt={tr('profile.clientName.documentAlt', { number: i + 1 })}
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
                        {t.profile.clientName.needHelp}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-xd-406 h-xd-44 rounded-xd-15 bg-[#3066CC] text-white font-medium text-xd-13 disabled:opacity-50"
                    >
                        {saving ? t.common.saving : t.common.save}
                    </button>
                )}
            </div>
        </div>
    );
}
