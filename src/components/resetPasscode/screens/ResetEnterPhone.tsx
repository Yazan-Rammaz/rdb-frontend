'use client';

import Image from 'next/image';
import PhoneInput from '@/components/ui/PhoneInput';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import shieldSvg from '@/assets/icons/auth/shield.svg';
import flagSvg from '@/assets/icons/auth/sim.svg';
import closeSvg from '@/assets/icons/auth/close.svg';

interface ResetEnterPhoneProps {
    phone: string;
    setPhone: (phone: string) => void;
    onSubmit: (phone: string) => void;
    loading?: boolean;
    onClose?: () => void;
}

/**
 * Reset-passcode phone entry (Image #2). Copy of the auth EnterPhone screen with
 * reset-specific copy; the original is left untouched.
 */
export default function ResetEnterPhone({
    phone,
    setPhone,
    onSubmit,
    loading,
    onClose,
}: ResetEnterPhoneProps) {
    const { t } = useTranslation();

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Close button */}
            <div className="flex absolute justify-end right-xd-30 top-xd-30">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-xd-24 h-xd-24 flex items-center justify-center"
                    >
                        <Image
                            src={closeSvg}
                            alt="close"
                            width={16}
                            height={16}
                            className="object-contain"
                        />
                    </button>
                )}
            </div>

            <FlexibleSpace size={0} share={0.3} />

            <div className="w-full h-full flex flex-col">
                {/* Top half — title + info, pinned to the midpoint */}
                <div className="h-1/2 flex flex-col justify-end px-xd-20">
                    <div className="h-xd-115">
                        <h2 className="text-trim-descend text-xd-30 px-xd-20 font-bold text-[#1D1D1D]">
                            Reset Passcode !
                        </h2>
                        <div className="flex px-xd-20 flex-col pt-xd-12">
                            <p className="text-trim-descend text-xd-16 text-[#1D1D1D] font-medium">
                                Enter Your Phone Number Registered With Us
                            </p>
                            <div className="flex items-center pt-xd-8 gap-xd-5">
                                <span className="text-trim-descend text-xd-12 text-[#1D1D1D]">
                                    We Will Send A Verification Code To The Number
                                </span>
                                <div className="w-xd-15 h-xd-15 shrink-0">
                                    <Image
                                        src={flagSvg}
                                        alt="sim"
                                        width={15}
                                        height={15}
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center pt-xd-8 gap-xd-5">
                                <span className="text-trim-descend text-xd-11 text-[#C3C3C3]">
                                    {t.auth.enterPhone.privacyLine1}
                                </span>
                                <div className="w-xd-14 h-xd-14 shrink-0">
                                    <Image
                                        src={shieldSvg}
                                        alt="shield"
                                        width={14}
                                        height={14}
                                        className="object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <FlexibleSpace size={60} share={0} />
                </div>

                {/* Bottom half — phone input, offset from midpoint */}
                <FlexibleSpace size={35} share={0} />
                <div className="h-1/2 flex flex-col items-center">
                    <div className="w-xd-390 h-xd-60">
                        <PhoneInput
                            onSend={() => onSubmit(phone)}
                            value={phone}
                            onChange={setPhone}
                            placeholder={t.auth.enterPhone.phonePlaceholder}
                            isLoading={loading}
                        />
                    </div>
                    <FlexibleSpace grow />
                </div>
            </div>
        </div>
    );
}
