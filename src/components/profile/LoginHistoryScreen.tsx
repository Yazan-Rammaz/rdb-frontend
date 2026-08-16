'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import Skeleton from 'react-loading-skeleton';
import loginhistoryIcon from '@/assets/icons/profile/loginhistory.svg';
import { useTranslation } from '@/context/I18nContext';
import { createLoginHistoryService } from '@/services/login-history';
import { formatLoginTime } from '@/lib/formatLoginTime';
import type { LoginHistoryItem, LoginDevice } from '@/core/types/loginHistory';

interface LoginHistoryScreenProps {
    onBack: () => void;
}

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : undefined);
// The backend sends the literal "unknown" for unresolved fields — treat it as missing.
const known = (s?: string) => (s && s.toLowerCase() !== 'unknown' ? s : undefined);

function deviceLabel(d?: LoginDevice): string {
    if (!d) return 'Unknown device';
    const b = known(d.browser);
    const browser = b ? cap(b) + (d.browserVersion ? ` ${d.browserVersion}` : '') : undefined;
    const parts = [browser, cap(known(d.operatingSystem)), cap(known(d.device))].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Unknown device';
}

function locationLabel(city?: string, country?: string): string {
    const parts = [city, country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Unknown';
}

export default function LoginHistoryScreen({ onBack }: LoginHistoryScreenProps) {
    const { language } = useTranslation();
    // `null` = still loading; `[]` = loaded but empty.
    const [items, setItems] = useState<LoginHistoryItem[] | null>(null);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;
        setItems(null);
        setError(false);
        const lang = language === 'ar' ? 'ar' : 'en';
        createLoginHistoryService()
            .getRecentLogins({ limit: 20, lang })
            .then((data) => {
                if (active) setItems(data.items);
            })
            .catch(() => {
                if (active) {
                    setError(true);
                    setItems([]);
                }
            });
        return () => {
            active = false;
        };
    }, [language, reloadKey]);

    const loading = items === null;
    const isEmpty = !error && Array.isArray(items) && items.length === 0;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-center relative px-xd-28 pt-xd-14 pb-xd-10">
                <button
                    onClick={onBack}
                    className="absolute left-xd-20 flex items-center text-[#1D1D1D]"
                >
                    <ChevronLeft className="w-xd-22 h-xd-22" />
                </button>
                <span className="text-xd-16 font-medium text-[#1D1D1D]">Login History</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-xd-12 pt-xd-8 pb-xd-20 flex flex-col gap-xd-8">
                {loading && (
                    <>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} width={370} height={64} borderRadius={15} />
                        ))}
                    </>
                )}

                {!loading && error && (
                    <div className="flex flex-1 flex-col items-center justify-center text-center px-xd-24 gap-xd-10">
                        <span className="text-[#1D1D1D] text-xd-13 font-medium">
                            Couldn&apos;t load your login history
                        </span>
                        <button
                            type="button"
                            onClick={() => setReloadKey((k) => k + 1)}
                            className="text-xd-12 font-medium text-[#3066CC] px-xd-16 py-xd-8 rounded-xd-15 bg-[#F0F6FD]"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && isEmpty && (
                    <div className="flex flex-1 flex-col items-center justify-center text-center px-xd-24 gap-xd-8">
                        <Image
                            src={loginhistoryIcon}
                            alt=""
                            width={28}
                            height={28}
                            className="object-contain opacity-40"
                        />
                        <span className="text-[#1D1D1D] text-xd-13 font-medium">
                            No login activity yet
                        </span>
                        <span className="text-[#888] text-xd-11 leading-tight">
                            Your recent sign-ins will appear here.
                        </span>
                    </div>
                )}

                {!loading &&
                    !error &&
                    !isEmpty &&
                    items!.map((e) => (
                        <div
                            key={e.id}
                            className="flex items-start w-xd-370 justify-between rounded-xd-15 bg-[#FCFCFC] px-xd-14 py-xd-12 gap-xd-10"
                        >
                            <div className="flex items-start gap-xd-12 min-w-0">
                                <Image
                                    src={loginhistoryIcon}
                                    alt=""
                                    width={18}
                                    height={18}
                                    className="object-contain mt-xd-1 shrink-0"
                                />
                                <div className="flex flex-col gap-xd-4 min-w-0">
                                    <span className="text-[#1D1D1D] text-xd-13 font-medium truncate">
                                        {deviceLabel(e.device)}
                                    </span>
                                    <span className="text-[#888] text-xd-11 leading-none truncate">
                                        {locationLabel(e.city, e.country) +
                                            ' · ' +
                                            (e.ipAddress ?? 'Unknown')}
                                    </span>
                                    <span className="text-[#888] text-xd-11 leading-none">
                                        {formatLoginTime(e.createdAt)}
                                    </span>
                                    {e.status === 'failure' && e.failureReasonLabel && (
                                        <span className="text-[#991B1B] text-xd-11 leading-none truncate">
                                            {e.failureReasonLabel}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span
                                className={
                                    'shrink-0 text-xd-11 font-medium px-xd-10 py-xd-4 rounded-full ' +
                                    (e.status === 'success'
                                        ? 'text-[#15803D] bg-[#F0FDF4]'
                                        : 'text-[#991B1B] bg-[#FFF1F2]')
                                }
                            >
                                {e.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    );
}
