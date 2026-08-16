'use client';

import { RdbIcon } from '../../icons';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import qrloginSvg from '@/assets/icons/auth/qrlogin.svg';
import Image from 'next/image';

interface GetStartedScreenProps {
    onExistingAccount?: () => void;
    onNewCustomer?: () => void;
    onLater?: () => void;
    onScanQr?: () => void;
}
// all items hieght 616
export default function GetStartedScreen({
    onExistingAccount,
    onNewCustomer,
    onLater,
    onScanQr,
}: GetStartedScreenProps) {
    const { t } = useTranslation();

    // share values must sum to 1 across all FlexibleSpace instances on this page.
    // Space above logo absorbs 70%, space above buttons absorbs 30%.
    // At 800px available height: top space loses 92px, middle space loses 40px.

    return (
        <main className="w-full  bg-white flex flex-col">
            <div className="flex absolute justify-end right-xd-30 top-xd-30">
                {/* Login by scanning QR — links to the qr-login step */}
                <button
                    onClick={onScanQr}
                    className="w-xd-24 h-xd-24 flex items-center justify-center"
                >
                    <Image
                        src={qrloginSvg}
                        alt="close"
                        width={25}
                        height={25}
                        className="object-contain"
                    />
                </button>
            </div>
            {/* Space above logo — absorbs 45% of vertical compression */}
            <FlexibleSpace size={280} share={0.45} />

            {/* Logo */}
            <div className="flex flex-col items-center">
                <RdbIcon className="w-xd-144 h-xd-104" />
            </div>

            {/* Space between logo and content — absorbs 28% of vertical compression */}
            <FlexibleSpace size={174} share={0.28} />

            {/* Bottom Section */}
            <div className="flex flex-col items-center">
                <h2 className="text-xd-30 font-bold text-[#1D1D1D] h-xd-40 text-center">
                    {t.auth.getStarted.title}
                </h2>
                <FlexibleSpace size={24} share={0.04} />

                <div className="w-full flex items-center justify-center">
                    <p
                        className="text-xd-13 leading-[1.6] w-xd-376 text-center font-normal text-[#5D5C5D]
              tracking-tight last-line:tracking-normal first-letter:ml-[-0.8ch]"
                    >
                        {t.auth.getStarted.description}
                    </p>
                </div>
                {/* Buttons */}
                <FlexibleSpace size={35} share={0.042} />
                <div className="flex py-xd-6 flex-col items-center">
                    <button
                        onClick={onExistingAccount}
                        className="xd-dashed-border w-xd-390 h-xd-60 leading-[1.3] rounded-xd-20 bg-[#FCFCFC] text-[#5D5C5D] text-xd-16"
                    >
                        {t.auth.getStarted.haveAccount}
                    </button>
                    <button
                        onClick={onNewCustomer}
                        className="xd-dashed-border w-xd-390 h-xd-60 leading-[1.3] rounded-xd-20 bg-[#FCFCFC] text-[#5D5C5D] text-xd-16 mt-xd-8"
                    >
                        {t.auth.getStarted.newCustomer}
                    </button>
                </div>

                {/* Login by scanning QR — links to the qr-login step */}
                <FlexibleSpace size={30} share={0.02} />
                {/* Footer Link */}
                <button
                    onClick={onLater}
                    className="text-xd-13 text-[#4D84FF] transition-colors hover:opacity-70"
                >
                    {t.auth.getStarted.later}
                </button>
                <FlexibleSpace size={35} share={0} />
            </div>
        </main>
    );
}
