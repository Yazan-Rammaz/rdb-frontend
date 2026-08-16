'use client';

import Image from 'next/image';
import { useTranslation } from '@/context/I18nContext';
import { FlexibleSpace } from '@/scaling';
import blueInfoSvg from '@/assets/icons/auth/blue-info.svg';
import warnInfoSvg from '@/assets/icons/auth/warn-info.svg';

type RegistrationStatusScreenProps =
    | {
          variant: 'already-registered';
          phone?: string;
          onLoginAndContinue?: () => void;
          onCancel?: () => void;
      }
    | {
          variant: 'not-registered';
          phone?: string;
          onCreateAccount?: () => void;
          onCancel?: () => void;
      };

const variantConfig = {
    'already-registered': {
        bg: '#F4F8FF',
        icon: blueInfoSvg,
        phoneFontWeight: 'font-normal',
        buttonGap: 'gap-xd-30',
    },
    'not-registered': {
        bg: '#FFF9F0',
        icon: warnInfoSvg,
        phoneFontWeight: 'font-semibold',
        buttonGap: 'gap-xd-20',
    },
};

export default function RegistrationStatusScreen(props: RegistrationStatusScreenProps) {
    const { t } = useTranslation();
    const { variant, phone, onCancel } = props;
    const cfg = variantConfig[variant];
    const copy = variant === 'already-registered' ? t.auth.alreadyRegistered : t.auth.notRegistered;

    const primaryLabel =
        variant === 'already-registered'
            ? t.auth.alreadyRegistered.loginAndContinue
            : t.auth.notRegistered.createAccount;

    const handlePrimary =
        variant === 'already-registered' ? props.onLoginAndContinue : props.onCreateAccount;

    return (
        <div className="w-full h-full flex flex-col" style={{ backgroundColor: cfg.bg }}>
            {/* Top space — pushes content toward centre, absorbs 60% of vertical change */}
            <FlexibleSpace grow share={0.6} />

            {/* Info content */}
            <div className="px-xd-30 h-1/2 flex items-end">
                <div className="flex flex-col items-start justify-start">
                    <h2 className="text-xd-30 font-bold text-[#1D1D1D]">{copy.title}</h2>
                    <p className="text-xd-16 font-medium text-[#1D1D1D] mt-xd-10">
                        {copy.description}
                    </p>
                    <div className="flex items-center gap-xd-2 mt-xd-6">
                        <p className={`text-xd-12 ${cfg.phoneFontWeight} text-[#1D1D1D]`}>
                            +{phone}
                        </p>
                        <div className="w-xd-15 h-xd-15 ml-2 shrink-0">
                            <Image
                                src={cfg.icon}
                                alt="info"
                                width={15}
                                height={15}
                                className="object-contain"
                            />
                        </div>
                    </div>
                </div>
                <FlexibleSpace size={85} share={0} />
            </div>

            {/* Middle space — absorbs 40% of vertical change */}
            <FlexibleSpace size={106} share={0} />

            <div className="h-1/2 flex flex-col items-center">
                {/* Action buttons pinned near bottom */}
                <FlexibleSpace size={296} share={0.4} />
                <div className={`flex flex-col items-center px-xd-15 pb-xd-45 ${cfg.buttonGap}`}>
                    <button
                        onClick={handlePrimary}
                        className="w-xd-390 h-xd-60 rounded-xd-20 bg-[#FAFAFA] text-[#1D1D1D] text-xd-16 font-normal shadow-sm"
                    >
                        {primaryLabel}
                    </button>
                    <button
                        onClick={onCancel}
                        className="text-xd-13 text-[#4D84FF] transition-colors hover:opacity-70"
                    >
                        {copy.cancelAndLook}
                    </button>
                </div>

                <FlexibleSpace size={54} share={0} />
            </div>
        </div>
    );
}
