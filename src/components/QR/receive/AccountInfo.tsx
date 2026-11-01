import Input from '@/components/ui/Input';
import { useTranslation } from '@/context/I18nContext';
import { useState } from 'react';
import Image from 'next/image';
import EyeIcon from '@/assets/icons/layout/header/eye.svg';
import EyeOpenIcon from '@/assets/icons/layout/header/eye-open.svg';
import { maskString } from './utils';

interface AccountInfoProps {
    accountName: string;
    accountNumber: string;
    currency: string;
    showScanIcon?: boolean;
    reviewMode?: boolean;
    downloadMode?: boolean;
    showName?: boolean;
    hideRequired?: boolean;
    updateField?: (field: 'displayedAccountName', value: string) => void;
}

export function AccountInfo({
    accountName,
    accountNumber,
    updateField,
    currency,
    reviewMode = false,
    downloadMode = false,
    hideRequired = false,
    showName: controlledShowName,
}: AccountInfoProps) {
    const { t } = useTranslation();
    const [internalShowName, setInternalShowName] = useState(true);
    const showName = controlledShowName ?? internalShowName;

    const toggleShowName = () => {
        setInternalShowName((v) => !v);
        const newDisplayName = showName ? maskString(accountName) : accountName;
        updateField?.('displayedAccountName', newDisplayName);
    };

    return (
        <div className="flex flex-col gap-xd-8 px-xd-25 w-full">
            <div className="relative w-full flex items-start justify-center">
                <Input
                    hideRequired={hideRequired}
                    reviewMode={reviewMode}
                    disabled
                    readOnly
                    containerClassName="w-xd-380! h-xd-54 py-xd-10! px-xd-10 gap-xd-10 justify-center"
                    labelClassName="!font-normal leading-xd-11"
                    className="font-normal! leading-xd-16"
                    label={t.home.deposit.accountName}
                    value={showName ? accountName : maskString(accountName)}
                />
                {!downloadMode && (
                    <button
                        onClick={toggleShowName}
                        className="absolute right-xd-10 top-1/2 -translate-y-1/2 p-2"
                    >
                        <Image
                            src={!showName ? EyeIcon : EyeOpenIcon}
                            alt="toggle visibility"
                            width={16}
                            height={16}
                            className="size-xd-16 opacity-50"
                        />
                    </button>
                )}
            </div>
            <div className="relative w-full flex items-start justify-center">
                <Input
                    hideRequired={hideRequired}
                    reviewMode={reviewMode}
                    disabled
                    readOnly
                    containerClassName="w-xd-380 h-xd-54 !py-0 px-xd-10 gap-xd-10 justify-center"
                    labelClassName="!font-normal leading-xd-11"
                    className="font-normal! leading-xd-16"
                    label={t.home.deposit.accountNumber}
                    value={`${accountNumber}  ${currency}`}
                />
            </div>
        </div>
    );
}
