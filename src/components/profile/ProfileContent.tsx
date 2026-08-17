'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useStore } from '@/context/StoreContext';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check } from 'lucide-react';
import type { SupportedLanguage } from '@/i18n';
import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import Skeleton from 'react-loading-skeleton';
import PhoneSvg from '@/assets/icons/profile/phone.svg';
import settingsIcon from '@/assets/icons/profile/settings.svg';
import termsIcon from '@/assets/icons/profile/terms.svg';
import legalIcon from '@/assets/icons/profile/legal.svg';
import aboutusIcon from '@/assets/icons/profile/aboutus.svg';
import shareappIcon from '@/assets/icons/profile/shareapp.svg';
import warnSvg from '@/assets/icons/profile/warn.svg';
import infoSvg from '@/assets/icons/profile/info.svg';
import languageIcon from '@/assets/icons/profile/language.svg';
import loginhistoryIcon from '@/assets/icons/profile/loginhistory.svg';
import logoutIcon from '@/assets/icons/profile/logout.svg';
import unprotectedIcon from '@/assets/icons/profile/unprotected.svg';
import verifiedBigIcon from '@/assets/icons/verification/verified-big.svg';
import notVerifiedIcon from '@/assets/icons/verification/not-verified.svg';
import addPhotoIcon from '@/assets/icons/profile/add_photo.svg';
import defaultProfile from '@/assets/icons/profile/defaultprofile.svg';
import ProfilePhotoScreen from './ProfilePhotoScreen';
import ClientInformationScreen from './ClientInformationScreen';
import ClientQRScreen from './ClientQRScreen';
import ClientNameScreen from './ClientNameScreen';
import ClientPhoneScreen from './ClientPhoneScreen';
import LoginHistoryScreen from './LoginHistoryScreen';
import { QRCodeDisplay } from '../QR/send/shared/QRCodeDisplay';

import { KycVerificationStatus, type KycStatusResponse } from '@/core/types/auth';
import { api } from '@/api';

const ProfileContent = () => {
    const { userData, removeAuthCookies, refreshUser, isLoading } = useAuth();
    const { account } = useStore();
    const { toast } = useToast();
    const router = useRouter();
    const { t, language, setLanguage } = useTranslation();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [kycStatus, setKycStatus] = useState<KycStatusResponse | null | undefined>(undefined);
    const [showPhotoScreen, setShowPhotoScreen] = useState(false);
    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(undefined);
    const [localFullName, setLocalFullName] = useState<string | undefined>(undefined);
    const [showLangModal, setShowLangModal] = useState(false);
    const [showClientInfo, setShowClientInfo] = useState(false);
    const [showClientQR, setShowClientQR] = useState(false);
    const [showClientName, setShowClientName] = useState(false);
    const [showClientPhone, setShowClientPhone] = useState(false);
    const [showLoginHistory, setShowLoginHistory] = useState(false);

    useEffect(() => {
        api.kyc.status().then((res) => setKycStatus(res.ok ? res.data : null));
    }, []);

    useEffect(() => {
        if (userData?.user?.profilePictureURL) {
            setLocalPhotoUrl(userData.user.profilePictureURL);
        }
    }, [userData]);

    const handleLogout = async () => {
        setShowLogoutDialog(false);
        await removeAuthCookies();
        localStorage.clear();
        localStorage.removeItem('rdb_passcode');
        localStorage.removeItem('rdb_passkey_locked');
        window.location.reload();
    };

    const handlePhotoSave = async (dataUrl: string) => {
        const user = userData?.user;
        if (!user) return;

        if (!dataUrl) {
            setLocalPhotoUrl(undefined);
            setImgError(false);
            // Empty string clears it — undefined would be dropped from the JSON
            // and leave the existing photo in place.
            const delRes = await api.profile.update({ profilePictureURL: '' });
            if (delRes.ok) {
                toast.success('Photo removed successfully');
            } else {
                toast.error(delRes.error.message);
            }
            return;
        }

        // Convert the cropper's dataUrl back into a File for the multipart upload.
        const blobRes = await fetch(dataUrl);
        const blob = await blobRes.blob();
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

        const uploadRes = await api.profile.uploadPhoto(file);
        if (!uploadRes.ok) {
            toast.error(uploadRes.error.message);
            return;
        }
        const imageUrl = uploadRes.data.url;

        const updateRes = await api.profile.update({
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureURL: imageUrl,
            language: user.language,
        });
        if (!updateRes.ok) {
            toast.error(updateRes.error.message);
            return;
        }

        setLocalPhotoUrl(imageUrl);
        setImgError(false);
        toast.success('Photo updated successfully');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col w-full h-full overflow-y-auto bg-white">
                <div className="flex items-start w-xd-406 justify-between px-xd-24 pt-xd-32 pb-xd-16">
                    <div className="flex flex-col gap-xd-10">
                        <Skeleton width={40} height={40} borderRadius={8} />
                        <Skeleton width={100} height={14} borderRadius={6} />
                        <Skeleton width={130} height={14} borderRadius={6} />
                        <Skeleton width={110} height={13} borderRadius={6} />
                    </div>
                    <Skeleton width={80} height={110} borderRadius={12} />
                </div>
                <div className="h-px bg-[#d3d3d35e] mx-xd-25" />
                <div className="px-xd-10 pt-xd-16 flex flex-col gap-xd-10">
                    <Skeleton height={58} borderRadius={12} />
                    <Skeleton height={58} borderRadius={12} />
                    <Skeleton height={44} borderRadius={12} />
                </div>
                <div className="h-px bg-[#d3d3d35e] mx-xd-25 mt-xd-16" />
                <div className="px-xd-25 pt-xd-8 flex flex-col">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} height={58} borderRadius={0} className="mb-px" />
                    ))}
                </div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
                {t.profile.noUserData}
            </div>
        );
    }

    const user = userData.user;
    const status = kycStatus?.status;
    const isApproved =
        status === KycVerificationStatus.VERIFIED || status === KycVerificationStatus.PENDING;
    const isPending = status === KycVerificationStatus.PENDING;
    const isRejected =
        status === KycVerificationStatus.REJECTED || status === KycVerificationStatus.EXPIRED;
    const hasKyc = !!status && status !== KycVerificationStatus.NOT_SUBMITTED;
    const photoUrl = localPhotoUrl;
    const hasPhoto = !!photoUrl && !imgError;

    const menuItems = [
        { icon: settingsIcon, label: t.profile.settings },
        { icon: termsIcon, label: t.profile.termsConditions },
        { icon: legalIcon, label: t.profile.legalInfo },
        { icon: aboutusIcon, label: t.profile.aboutUs },
        { icon: shareappIcon, label: t.profile.shareApp },
    ];
    console.log('Rendering ProfileContent with user:', user, 'kycStatus:', kycStatus);
    return (
        <>
            {showPhotoScreen && (
                <div className="fixed inset-0 z-[200] bg-white">
                    <ProfilePhotoScreen
                        currentUrl={localPhotoUrl}
                        onBack={() => setShowPhotoScreen(false)}
                        onSave={handlePhotoSave}
                    />
                </div>
            )}

            <AnimatePresence>
                {showClientInfo && (
                    <motion.div
                        className="fixed inset-0 z-[200] bg-white"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <ClientInformationScreen
                            onBack={() => setShowClientInfo(false)}
                            onShowQR={() => setShowClientQR(true)}
                            onShowClientName={() => setShowClientName(true)}
                            onShowPhone={() => setShowClientPhone(true)}
                            user={
                                localFullName
                                    ? {
                                          ...user,
                                          firstName: localFullName.split(' ')[0],
                                          lastName:
                                              localFullName.split(' ').slice(1).join(' ') ||
                                              undefined,
                                      }
                                    : user
                            }
                            displayId={user.displayId ?? '-'}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showClientQR && (
                    <motion.div
                        className="fixed inset-0 z-[210] bg-white"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <ClientQRScreen
                            onBack={() => setShowClientQR(false)}
                            displayId={user.displayId ?? '—'}
                            clientName={
                                localFullName ??
                                ([user.firstName, user.lastName].filter(Boolean).join(' ') ||
                                    user.kycRequest?.fullName ||
                                    '—')
                            }
                            phoneNumber={user.phoneNumber}
                            isVerified={status === 'verified' || status === 'approved'}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showClientName && (
                    <motion.div
                        className="fixed inset-0 z-[220] bg-white"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <ClientNameScreen
                            onBack={() => setShowClientName(false)}
                            onVerifyNow={() => {
                                setShowClientName(false);
                                router.push('/verification');
                            }}
                            onSaved={(name) => setLocalFullName(name)}
                            fullName={
                                localFullName ??
                                ([user.firstName, user.lastName].filter(Boolean).join(' ') ||
                                    user.kycRequest?.fullName ||
                                    '')
                            }
                            isVerified={
                                status === KycVerificationStatus.VERIFIED || status === 'approved'
                            }
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLoginHistory && (
                    <motion.div
                        className="fixed inset-0 z-[200] bg-white"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <LoginHistoryScreen onBack={() => setShowLoginHistory(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col w-full h-full overflow-hidden bg-white">
                {/* ── Profile Header ── */}
                <div className="flex items-start justify-between px-xd-24 pt-xd-32 pb-xd-16">
                    <div className="flex flex-col gap-xd-7 text-left">
                        <div
                            className="relative size-xd-50 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowClientQR(true);
                            }}
                        >
                            <QRCodeDisplay value={user.displayId ?? '-'} size={50} />
                        </div>
                        <div className="flex items-baseline gap-0">
                            {/* <span className="text-[#1D1D1D] text-xd-13 leading-none">ID</span> */}
                            <span className="font-bold text-[#1D1D1D] text-xd-13 leading-none whitespace-nowrap">
                                {'ID '}
                                {user.displayId ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center gap-xd-6">
                            <span className="text-[#1D1D1D] items-baseline gap-x-xd-6 flex text-xd-13 mt-xd-1 leading-none whitespace-nowrap">
                                <span>
                                    {localFullName ??
                                        (user.firstName || user.lastName
                                            ? [user.firstName, user.lastName]
                                                  .filter(Boolean)
                                                  .join(' ')
                                            : '—')}{' '}
                                </span>
                                {isApproved && (
                                    <div className="size-xd-12 relative">
                                        <Image
                                            src={verifiedBigIcon}
                                            alt=""
                                            fill
                                            className="object-contain "
                                        />
                                    </div>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center gap-xd-6 mt-xd-1">
                            <span className="text-[#1D1D1D] text-xd-11 leading-none">
                                {user.phoneNumber}
                            </span>
                            <div className="relative size-xd-10">
                                <Image
                                    src={PhoneSvg}
                                    alt="phone"
                                    fill
                                    className="w-xd-10 h-xd-10 object-contain"
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        className="w-full h-full cursor-pointer"
                        onClick={() => setShowClientInfo(true)}
                    ></button>
                    {/* Profile photo — clickable */}
                    <button
                        type="button"
                        onClick={() => setShowPhotoScreen(true)}
                        className="relative w-xd-110 h-xd-110 rounded-xl border border-[#C3C3C3]/50 overflow-hidden shrink-0"
                    >
                        {hasPhoto ? (
                            <img
                                src={photoUrl}
                                alt={t.profile.profileAlt}
                                className="w-full h-full object-cover cursor-pointer"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <Image
                                src={defaultProfile}
                                alt="Default"
                                fill
                                className="object-contain"
                            />
                        )}
                        {/* Add Photo overlay — only when no photo */}
                        {!hasPhoto && (
                            <div className="absolute bottom-0 left-0 right-0 h-xd-22 bg-[#404040] flex items-center justify-center gap-xd-4">
                                <Image
                                    src={addPhotoIcon}
                                    alt=""
                                    width={13}
                                    height={13}
                                    className="object-contain size-xd-13"
                                />
                                <span className="text-[#FCFCFC] text-xd-10 leading-none">
                                    Add Photo
                                </span>
                            </div>
                        )}
                    </button>
                </div>

                <div className="h-px bg-[#d3d3d35e] mx-xd-25" />

                {/* ── KYC Status Section ── */}
                <div className="px-xd-12 pt-xd-16 flex flex-col gap-xd-10">
                    {!hasKyc && kycStatus !== undefined && (
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
                                            <span className="font-bold text-[#1D1D1D]">
                                                60/15 USD
                                            </span>{' '}
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
                                        <Image
                                            src={infoSvg}
                                            alt=""
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                                {/* Protect & Verify Now button */}
                                <button
                                    type="button"
                                    onClick={() => router.push('/verification')}
                                    className=" flex items-center justify-center gap-xd-6 h-xd-38 w-xd-382 rounded-xl bg-[#E0EDFF] text-[#1D1D1D] font-medium text-xd-11"
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

                    {/* {isApproved && (
                        <div className="flex items-center gap-xd-10 bg-[#F0FDF4] rounded-xl px-xd-14 h-14.5">
                            <span className="text-[#22C55E] text-xd-18">✓</span>
                            <div className="flex flex-col gap-xd-2">
                                <span className="font-bold text-[#15803D] text-xd-12">
                                    Identity Verified
                                </span>
                                <span className="text-[#888] text-xd-10">
                                    Your account has full access
                                </span>
                            </div>
                        </div>
                    )} */}

                    {isPending && (
                        <div className="flex items-center gap-xd-10  w-xd-406 h-xd-58 bg-[#FFFBEB] rounded-xl px-xd-14 h-[58px]">
                            <span className="text-[#F59E0B] text-xd-18">⏳</span>
                            <div className="flex flex-col gap-xd-2">
                                <span className="font-bold text-[#92400E] text-xd-12">
                                    Under Review
                                </span>
                                <span className="text-[#888] text-xd-10">
                                    Your verification is being reviewed
                                </span>
                            </div>
                        </div>
                    )}

                    {isRejected && (
                        <div className="flex items-center justify-between bg-[#FFF1F2] rounded-xl px-xd-14 h-14.5">
                            <div className="flex items-center gap-xd-10">
                                <span className="text-[#EF4444] text-xd-18">✕</span>
                                <div className="flex flex-col gap-xd-2">
                                    <span className="font-bold text-[#991B1B] text-xd-12">
                                        Verification Rejected
                                    </span>
                                    {kycStatus?.rejectionReason && (
                                        <span className="text-[#888] text-xd-10">
                                            {kycStatus.rejectionReason}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/verification')}
                                className="text-xd-11 font-semibold text-[#EF4444]"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* <div className="h-px bg-[#d3d3d35e] mx-xd-25 mt-xd-16" /> */}

                {/* ── Menu Items ── */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="flex flex-col px-xd-12 gap-xd-4 pt-xd-6 pb-xd-75">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="flex items-center justify-between h-xd-58 w-xd-406 rounded-xd-15 px-xd-12 py-xd-20 bg-[#FCFCFC]"
                            >
                                <div className="flex items-center gap-xd-16">
                                    <Image
                                        src={item.icon}
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="object-contain"
                                    />
                                    <span className="text-[#1D1D1D] text-xd-13 font-medium">
                                        {item.label}
                                    </span>
                                </div>
                                {/* <ChevronRight className="w-xd-16 h-xd-16 text-[#C0C0C0]" /> */}
                            </button>
                        ))}

                        {/* Language */}
                        <button
                            type="button"
                            onClick={() => setShowLangModal(true)}
                            className="flex items-center justify-between h-xd-58 w-xd-406 rounded-xd-15 px-xd-12 py-xd-20 bg-[#FCFCFC]"
                        >
                            <div className="flex items-center gap-xd-16">
                                <div className="relative w-4.5 h-4.5 shrink-0">
                                    <Image
                                        src={languageIcon}
                                        alt=""
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-[#1D1D1D] text-xd-13 font-medium">
                                    {language === 'ar'
                                        ? t.languageSelector.arabic
                                        : language === 'tr'
                                          ? t.languageSelector.turkish
                                          : t.languageSelector.english}
                                </span>
                            </div>
                            {/* <ChevronRight className="w-xd-16 h-xd-16 text-[#C0C0C0]" /> */}
                        </button>

                        {/* Login History */}
                        <button
                            type="button"
                            onClick={() => setShowLoginHistory(true)}
                            className="flex items-center justify-between h-xd-58 w-xd-406 rounded-xd-15 px-xd-12 py-xd-20 bg-[#FCFCFC]"
                        >
                            <div className="flex items-center gap-xd-16">
                                <Image
                                    src={loginhistoryIcon}
                                    alt=""
                                    width={18}
                                    height={18}
                                    className="object-contain"
                                />
                                <span className="text-[#1D1D1D] text-xd-13 font-medium">
                                    Login History
                                </span>
                            </div>
                            <span className="text-[#888] text-xd-11 font-normal">
                                Active Session
                            </span>
                        </button>

                        {/* Logout */}
                        <button
                            type="button"
                            onClick={() => setShowLogoutDialog(true)}
                            className="flex items-center justify-between h-xd-58 w-xd-406 rounded-xd-15 px-xd-12 py-xd-20 bg-[#FCFCFC]"
                        >
                            <div className="flex items-center gap-xd-16">
                                <Image
                                    src={logoutIcon}
                                    alt=""
                                    width={18}
                                    height={18}
                                    className="object-contain"
                                />
                                <span className="text-[#ef4444] text-xd-13 font-medium">
                                    {t.profile.logout}
                                </span>
                            </div>
                            {/* <ChevronRight className="w-xd-16 h-xd-16 text-[#C0C0C0]" /> */}
                        </button>
                    </div>
                </div>
            </div>

            {/* Language modal */}
            {showLangModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center"
                    onClick={() => setShowLangModal(false)}
                >
                    <div className="absolute inset-0 bg-black/30" />
                    <div
                        className="relative w-full bg-white rounded-t-2xl pb-xd-10 z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center pt-xd-12 pb-xd-16">
                            <div className="w-xd-40 h-xd-4 rounded-full bg-gray-300" />
                        </div>
                        <p className="text-xd-15 font-semibold text-[#1D1D1D] px-xd-24 pb-xd-12">
                            {t.languageSelector.label}
                        </p>
                        {[
                            {
                                code: 'en' as SupportedLanguage,
                                flag: 'gb',
                                label: t.languageSelector.english,
                                native: 'English',
                            },
                            {
                                code: 'ar' as SupportedLanguage,
                                flag: 'sa',
                                label: t.languageSelector.arabic,
                                native: 'العربية',
                            },
                            {
                                code: 'tr' as SupportedLanguage,
                                flag: 'tr',
                                label: t.languageSelector.turkish,
                                native: 'Türkçe',
                            },
                        ].map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setShowLangModal(false);
                                }}
                                className="flex items-center justify-between w-full px-xd-24 h-xd-58 border-b border-[#d3d3d35e] last:border-b-0"
                            >
                                <div className="flex items-center gap-xd-14">
                                    <img
                                        src={`https://flagcdn.com/w40/${lang.flag}.png`}
                                        alt={lang.native}
                                        className="w-xd-24 h-xd-16 object-cover rounded-sm"
                                    />
                                    <div className="flex flex-col items-start">
                                        <span className="text-xd-13 font-medium text-[#1D1D1D]">
                                            {lang.label}
                                        </span>
                                        <span className="text-xd-11 text-[#888]">
                                            {lang.native}
                                        </span>
                                    </div>
                                </div>
                                {language === lang.code && (
                                    <div className="w-xd-20 h-xd-20 rounded-full bg-[#3066CC] flex items-center justify-center">
                                        <Check
                                            className="w-xd-11 h-xd-11 text-white"
                                            strokeWidth={3}
                                        />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={showLogoutDialog}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutDialog(false)}
                title={t.profile.logout}
                message={t.profile.logoutConfirmation}
                confirmLabel={t.profile.logout}
                cancelLabel={t.common.cancel}
            />
        </>
    );
};

export default ProfileContent;
