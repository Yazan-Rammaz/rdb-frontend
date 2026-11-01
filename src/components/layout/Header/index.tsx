'use client';

import React from 'react';
import Image from 'next/image';
import RdbSmallIcon from '../../../assets/icons/layout/header/rdbsmall.svg';
import SendIcon from '../../../assets/icons/layout/header/send.svg';
import ReceiveIcon from '../../../assets/icons/layout/header/receive.svg';
import ScannerIcon from '../../../assets/icons/layout/header/scannercode.svg';
import LockIcon from '../../../assets/icons/profile/lock.svg';
import { useTranslation } from '@/context/I18nContext';
import { useScanner } from '@/context/ScannerContext';
import { useStore } from '@/context/StoreContext';
import { usePasskey } from '@/context/PasskeyContext';
import { usePathname } from 'next/navigation';
import WSStatusDot from './WSStatusDot';

const Header = () => {
    const { t } = useTranslation();
    const { setOpen } = useScanner();
    const { activeAssetSymbol } = useStore();
    const { triggerLock } = usePasskey();
    const pathname = usePathname();
    const isSettingsPage = pathname?.includes('/settings');

    return (
        <header className="relative w-full bg-white flex items-end justify-between h-xd-70 px-xd-25">
            <WSStatusDot />
            {/* Logo */}
            <div className="flex h-full items-center gap-3">
                <div className="relative h-xd-30 w-xd-60">
                    <Image
                        src={RdbSmallIcon}
                        alt={t.common.logoAlt}
                        fill
                        className="object-contain object-left"
                    />
                </div>
            </div>

            {/* Right Icons — order: Receive, Send, Scanner */}
            <div className="flex items-center mb-2 gap-xd-30">
                {/* Receive Icon */}
                {activeAssetSymbol && (
                    <div className="flex flex-col items-center gap-xd-8">
                        <div
                            className="relative size-xd-20 cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => setOpen('receive')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setOpen('receive');
                                }
                            }}
                            aria-label={t.common.accessibility.receive}
                        >
                            <Image
                                src={ReceiveIcon}
                                alt="Receive"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-normal text-[#404040] leading-none text-xd-11">
                            {t.header.receive}
                        </span>
                    </div>
                )}

                {/* Send Icon */}
                {activeAssetSymbol && (
                    <div className="flex flex-col items-center gap-xd-8">
                        <div
                            className="relative size-xd-20 cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => setOpen('send')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setOpen('send');
                                }
                            }}
                            aria-label={t.common.accessibility.send}
                        >
                            <Image src={SendIcon} alt="Send" fill className="object-contain" />
                        </div>
                        <span className="font-normal text-[#404040] leading-none text-xd-11">
                            {t.header.send}
                        </span>
                    </div>
                )}

                {/* Lock (settings) or Scanner (other pages) */}
                {isSettingsPage ? (
                    <div className="flex flex-col items-center gap-xd-4">
                        <div
                            className="relative size-xd-25 cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={triggerLock}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerLock(); }}
                            aria-label="Lock"
                        >
                            <Image src={LockIcon} alt="Lock" fill className="object-contain" />
                        </div>
                        <span className="font-normal text-[#1D1D1D] leading-none text-xd-10">Lock</span>
                    </div>
                ) : (
                    <div className="flex flex-col justify-start items-start gap-xd-8">
                        <div
                            className="relative size-xd-25 cursor-pointer hover:opacity-70 transition-opacity"
                            onClick={() => setOpen('scan')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen('scan'); }}
                            aria-label={t.common.scanCodeAlt}
                        >
                            <Image src={ScannerIcon} alt={t.common.scanCodeAlt} fill className="object-contain" />
                        </div>
                        <span className="font-normal text-[#404040] leading-none text-xd-11" />
                    </div>
                )}
            </div>
            {/* Bottom Border */}
            <div className="absolute bottom-0 left-6 right-6 h-px bg-[#d3d3d35e]" />
        </header>
    );
};

export default Header;
