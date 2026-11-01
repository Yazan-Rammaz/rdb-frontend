'use client';

import React, { useState } from 'react';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';
import DollarIcon from '@/assets/icons/home/dollar.svg';
import RefreshIcon from '@/assets/icons/home/transfer/refresh.svg';
import EyeWhiteIcon from '@/assets/icons/layout/header/eye-white.svg';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';

interface SenderCardProps {
    selectedAssetSymbol?: string;
    displayAmount?: number;
}

const SenderCard: React.FC<SenderCardProps> = ({ selectedAssetSymbol, displayAmount }) => {
    const {
        account,
        balances,
        currencies,
        metals,
        activeAssetSymbol,
        balanceHidden,
        setBalanceHidden,
        refreshBalances,
    } = useStore();
    const { toast } = useToast();
    const { t, rtl, language } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fallbackSymbol = selectedAssetSymbol || activeAssetSymbol || 'USD';
    const balance = fallbackSymbol ? balances[fallbackSymbol] : undefined;
    const assetMeta = [...currencies, ...metals].find((asset) => asset.symbol === fallbackSymbol);

    const currencySymbol = balance?.asset?.symbol || assetMeta?.symbol || fallbackSymbol;
    const currencyName =
        balance?.asset?.name || assetMeta?.displayName || assetMeta?.name || fallbackSymbol;
    const available = balance?.available ?? 0;
    const shownAmount = typeof displayAmount === 'number' ? displayAmount : available;

    const accountNumber = account?.number || '';
    const accountType = account?.type || 'Main';
    const accountName = account?.name || '';

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshBalances(fallbackSymbol);
        } catch {
            toast.error(t.transfer.sender.refreshBalance);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="flex items-center justify-center w-full">
            <div className="bg-[#3C3C3C] rounded-xd-16 h-xd-120 p-xd-16 w-xd-370 relative">
                {/* Refresh button */}
                <button
                    disabled={isRefreshing}
                    onClick={handleRefresh}
                    className={`absolute cursor-pointer disabled:cursor-not-allowed top-xd-16 z-50 ${rtl ? 'left-xd-16' : 'right-xd-16'} text-white hover:text-white transition-colors`}
                    aria-label={t.common.accessibility.refreshBalance}
                >
                    <Image
                        src={RefreshIcon}
                        alt="Refresh"
                        width={20}
                        height={20}
                        className="size-xd-20"
                    />
                </button>

                {/* Currency symbol */}
                <Image
                    src={DollarIcon}
                    alt="Currency"
                    width={20}
                    height={20}
                    className="size-xd-20"
                />

                {/* Sender Account label */}
                <p className="text-white text-xd-11 font-light mt-xd-4">
                    {t.transfer.sender.label}
                </p>

                {/* Account info line */}
                <p className="text-[#FCFCFC] font-light text-xd-13 mt-xd-2">
                    {accountType} | {accountNumber} | {accountName}
                </p>

                {/* Balance row */}
                <div className="flex items-end gap-xd-8 mt-xd-8">
                    <span className="text-white text-xd-25 font-medium leading-none">
                        {isRefreshing ? (
                            <Loader2 className="w-xd-48 h-xd-26 text-white animate-spin" />
                        ) : balanceHidden ? (
                            '••••'
                        ) : (
                            shownAmount.toLocaleString(language)
                        )}
                    </span>
                    <div className="flex items-center gap-xd-6 pb-xd-4">
                        <span className="text-white font-light text-xd-9">
                            {currencySymbol} | {currencyName}
                        </span>
                        {/* Eye toggle */}
                        <button
                            onClick={() => setBalanceHidden(!balanceHidden)}
                            className="text-white hover:text-white transition-colors"
                            aria-label={
                                balanceHidden
                                    ? t.common.accessibility.showBalance
                                    : t.common.accessibility.hideBalance
                            }
                        >
                            {balanceHidden ? (
                                <Image
                                    src={EyeWhiteIcon}
                                    alt="Show"
                                    width={14}
                                    height={14}
                                    className="size-xd-14"
                                />
                            ) : (
                                <Image
                                    src={EyeWhiteIcon}
                                    alt="Hide"
                                    width={14}
                                    height={14}
                                    className="size-xd-14"
                                />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SenderCard;
