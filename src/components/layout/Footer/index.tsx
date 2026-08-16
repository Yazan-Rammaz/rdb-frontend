'use client';

import React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { HomeIcon, TransactionIcon, AddressIcon, SettingIcon } from './Icons';
import { UniversalLink } from '../../ui/UniversalLink';
import { useTranslation } from '@/context/I18nContext';

const Footer = () => {
    const pathname = usePathname();
    const { t } = useTranslation();
    const items = [
        { name: t.footer.home, icon: HomeIcon, href: '/home' },
        {
            name: t.footer.transactions,
            icon: TransactionIcon,
            href: '/transactions',
        },
        { name: t.footer.addresses, icon: AddressIcon, href: '/addresses' },
        { name: t.footer.settings, icon: SettingIcon, href: '/settings' },
    ];

    return (
        <footer className="absolute bottom-0 w-full bg-[#F4F5F5] py-2 px-6 md:px-16 lg:px-24">
            <div className="flex items-center justify-between w-full">
                {items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const IconComponent = item.icon;
                    return (
                        <UniversalLink
                            href={item.href}
                            key={item.name}
                            className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                        >
                            <div className="w-10.5 h-6 relative flex items-center justify-center">
                                <IconComponent className="object-contain" active={isActive} />
                            </div>
                            <span
                                className={`text-[10px] font-['SF_Pro_Rounded',sans-serif] tracking-wide ${isActive ? 'text-[#404040] font-medium' : 'text-[#A2A0A0] font-light'}`}
                            >
                                {item.name}
                            </span>
                        </UniversalLink>
                    );
                })}
            </div>
        </footer>
    );
};

export default Footer;
