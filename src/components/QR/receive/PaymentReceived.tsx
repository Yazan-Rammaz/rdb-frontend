'use client';

import Image from 'next/image';
import TransferDoneIcon from '@/assets/icons/home/transfer/transferdone.svg';
import { useTranslation } from '@/context/I18nContext';

interface PaymentReceivedProps {
    /** Side of the square it fills — the QR's size, so nothing moves when it swaps in. */
    size: number;
    amount: string | number;
    currency: string;
}

/** Shown to the requester in place of the QR once the request has been paid. */
export function PaymentReceived({ size, amount, currency }: PaymentReceivedProps) {
    const { t } = useTranslation();

    return (
        <div
            role="status"
            className="flex flex-col items-center justify-center gap-xd-12"
            style={{ width: size, height: size }}
        >
            <Image src={TransferDoneIcon} alt="" className="size-xd-56" />
            <p className="text-xd-13 text-[#1D1D1D] font-medium text-center uppercase">
                {t.home.qr.paymentReceived}
            </p>
            <p className="text-xd-22 text-[#1D1D1D] font-bold" dir="ltr">
                {amount} {currency}
            </p>
        </div>
    );
}
