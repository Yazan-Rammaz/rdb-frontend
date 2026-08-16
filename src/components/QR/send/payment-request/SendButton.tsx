'use client';

import React from 'react';
import Image from 'next/image';
import TransferIcon from '@/assets/icons/home/transfer/transfer.svg';
import TransferDisabledIcon from '@/assets/icons/home/transfer/transferdisabled.svg';
import { useTranslation } from '@/context/I18nContext';

interface SendButtonProps {
    isExpired: boolean;
    isSending: boolean;
    isDisabled: boolean;
    onSend: () => void;
}

const SendButton: React.FC<SendButtonProps> = ({
    isExpired,
    isSending,
    isDisabled,
    onSend,
}) => {
    const { t } = useTranslation();

    if (isExpired) {
        return (
            <div className="flex w-full flex-col items-center py-6">
                <button
                    disabled
                    className="w-full max-w-[320px] py-3.5 rounded-xl bg-[#FF4D4D]/10 text-[#FF4D4D] text-[14px] font-semibold cursor-not-allowed"
                >
                    {t.transfer.deposit.expiredButton}
                </button>
            </div>
        );
    }

    const active = !isDisabled && !isSending;

    return (
        <div className="flex w-full flex-col items-center py-6">
            <button
                onClick={onSend}
                disabled={!active}
                className={`flex flex-col items-center gap-1 transition-colors ${
                    active ? 'text-[#388CFF] cursor-pointer' : 'text-[#CCCCCC]'
                }`}
            >
                {active ? (
                    <Image src={TransferIcon} alt="Send" width={25} height={25} />
                ) : (
                    <Image src={TransferDisabledIcon} alt="Send" width={25} height={25} />
                )}
                <span className="text-[13px] font-medium">
                    {isSending ? t.transfer.deposit.sendingButton : t.transfer.deposit.sendButton}
                </span>
            </button>
        </div>
    );
};

export default SendButton;
