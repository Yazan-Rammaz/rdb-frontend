import React from 'react';
import Image from 'next/image';
import AddCurrencyIcon from '../../../assets/icons/home/addcurrency.svg';
import AddAccountIcon from '../../../assets/icons/home/addaccount.svg';
import EyeHiddenIcon from '@/assets/icons/layout/header/eye.svg';
import EyeOpenIcon from '@/assets/icons/layout/header/eye-open.svg';
import { useTranslation } from '@/context/I18nContext';
import { useStore } from '@/context/StoreContext';

const NavHome = ({ activeAssetSymbol }: { activeAssetSymbol?: string }) => {
    const { tr, t } = useTranslation();
    const { balanceHidden, setBalanceHidden } = useStore();
    const currencyLabel = activeAssetSymbol ? activeAssetSymbol.toUpperCase() : undefined;
    const totalBalanceLabel = currencyLabel
        ? tr('home.totalBalanceWithCurrency', { currency: currencyLabel })
        : tr('home.totalBalance');
    const addCurrencyLabel = currencyLabel
        ? tr('home.addCurrencyWithAccount', { currency: currencyLabel })
        : tr('home.addCurrency');
    const icon = activeAssetSymbol ? AddAccountIcon : AddCurrencyIcon;
    return (
        <nav className="w-full flex items-center justify-between pt-xd-10 ps-xd-25 pe-xd-12">
            {/* Label + Eye toggle */}
            <div className="flex items-center gap-xd-10">
                <span className="font-bold text-[#1D1D1D] leading-4 text-xd-11">
                    {totalBalanceLabel}
                </span>
                <button
                    onClick={() => setBalanceHidden(!balanceHidden)}
                    className="relative cursor-pointer size-xd-14"
                    aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                >
                    <Image
                        src={balanceHidden ? EyeHiddenIcon : EyeOpenIcon}
                        alt={balanceHidden ? 'Balance hidden' : 'Balance visible'}
                        fill
                        className="object-contain"
                    />
                </button>
            </div>

            {/* Add Currency / Add Account button */}
            <div className="flex items-center cursor-pointer gap-xd-10">
                <div className="relative size-xd-14">
                    <Image src={icon} alt={icon} fill className="object-contain" />
                </div>
                <span className="font-normal text-[#388CFF] leading-4 text-xd-11">
                    {addCurrencyLabel}
                </span>
            </div>
        </nav>
    );
};
export default NavHome;
