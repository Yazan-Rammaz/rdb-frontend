'use client';

import CopySvg from '@/assets/icons/home/qr/copy.svg';
import AddRequestSvg from '@/assets/icons/home/qr/addrequest.svg';
import DownloadSvg from '@/assets/icons/home/qr/download.svg';
import ShareSvg from '@/assets/icons/home/qr/share.svg';
import GenerateIcon from '@/assets/icons/home/qr/generate.svg';
import GenerateActiveIcon from '@/assets/icons/home/qr/generateblue.svg';
import CancelIcon from '@/assets/icons/home/qr/cancel.svg';
import { useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { ActionButton } from '../shared/ActionButton';
import type { Mode } from './types';

interface ActionButtonsProps {
    mode: Mode;
    isFormValid?: boolean;
    isLoading?: boolean;
    onRequest?: () => void;
    onCopy?: () => void;
    onDownload?: () => void;
    onShare?: () => void;
    onGenerate?: () => void;
    onCancel?: () => void;
}

export function ActionButtons({
    mode,
    isFormValid,
    isLoading = false,
    onRequest,
    onCopy,
    onDownload,
    onShare,
    onGenerate,
    onCancel,
}: ActionButtonsProps) {
    const { t } = useTranslation();
    const hideCancel = isLoading;

    if (mode === 'review') {
        return (
            <div className="flex items-center justify-center gap-13 px-6 py-4">
                <ActionButton
                    icon={CopySvg}
                    label={t.home.qr.copy}
                    onClick={onCopy}
                    bounceOnClick
                />
                <ActionButton
                    icon={DownloadSvg}
                    label={t.home.qr.download}
                    onClick={onDownload}
                    bounceOnClick
                />
                <ActionButton
                    icon={ShareSvg}
                    label={t.home.qr.share}
                    onClick={onShare}
                    bounceOnClick
                    animationType="fly"
                />
            </div>
        );
    }

    if (mode === 'request') {
        return (
            <div className="flex items-center justify-center gap-xd-50 px-xd-60 pt-xd-20 pb-xd-20">
                <div className="w-5" />
                <ActionButton
                    icon={isFormValid ? GenerateActiveIcon : GenerateIcon}
                    label={isLoading ? t.home.qr.generatingRequest : t.home.qr.generateRequest}
                    onClick={onGenerate}
                    labelColor={isFormValid ? 'text-[#388CFF]' : 'text-[#8D8D8D]'}
                    disabled={!isFormValid || isLoading}
                    animationType="press"
                    forceAnimation={isLoading}
                />
                {!hideCancel ? (
                    <ActionButton
                        icon={CancelIcon}
                        label={t.home.qr.cancel}
                        onClick={onCancel}
                        labelColor="text-[#8D8D8D]"
                    />
                ) : (
                    <div className="w-5" />
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-xd-50 px-xd-60 pt-xd-20 pb-xd-20">
            <ActionButton icon={AddRequestSvg} label={t.home.qr.addRequest} onClick={onRequest} />
            <ActionButton icon={CopySvg} label={t.home.qr.copy} onClick={onCopy} bounceOnClick />
            <ActionButton
                icon={DownloadSvg}
                label={t.home.qr.download}
                onClick={onDownload}
                bounceOnClick
            />
            <ActionButton
                icon={ShareSvg}
                label={t.home.qr.share}
                onClick={onShare}
                bounceOnClick
                animationType="fly"
            />
        </div>
    );
}
