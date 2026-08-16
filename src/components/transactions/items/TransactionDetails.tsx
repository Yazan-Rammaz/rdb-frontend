'use client';

import React from 'react';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import DoneIcon from '@/assets/icons/home/transfer/done.svg';
import { useTranslation } from '@/context/I18nContext';
import { formatDateTime } from '@/components/QR/shared/formatDateTime';
import type { FinancialLedgerItem } from '@/core/types';
import LogoIcon from '@/assets/icons/home/qr/title.svg';

interface TransactionDetailsProps {
    ledger: FinancialLedgerItem;
    onClose: () => void;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ ledger, onClose }) => {
    const { t, language } = useTranslation();

    const isOutgoing = ledger.direction === 'OUT';
    const counterparty = isOutgoing ? ledger.receiverAccount : ledger.senderAccount;
    const dateTime = formatDateTime(ledger.createdAt, language);

    const getStatusColor = () => {
        switch (ledger.status) {
            case 'COMPLETED':
                return 'bg-[#E8F8F0] text-[#2DB56D]';
            case 'FAILED':
                return 'bg-[#FFF0F0] text-[#FF4D4D]';
            case 'PENDING':
                return 'bg-[#FFF8E8] text-[#F5A623]';
            default:
                return 'bg-[#F5F5F5] text-[#8D8D8D]';
        }
    };

    const getStatusLabel = () => {
        switch (ledger.status) {
            case 'COMPLETED':
                return t.home.transactionStatus.success;
            case 'PENDING':
                return t.home.transactionStatus.pending;
            case 'FAILED':
                return t.home.transactionStatus.failed;
            default:
                return ledger.status;
        }
    };

    const getTypeLabel = () => {
        switch (ledger.ledgerType) {
            case 'ACCOUNT_TRANSFER':
                return isOutgoing
                    ? t.home.transactions.transferSend
                    : t.home.transactions.transferReceive;
            case 'PAYMENT_REQUEST':
                return t.home.qr.paymentRequest;
            case 'DEPOSIT':
                return 'Deposit';
            case 'WITHDRAWAL':
                return 'Withdrawal';
            default:
                return ledger.title || t.home.transactions.defaultTitle;
        }
    };

    return (
        <div className="flex flex-col items-center w-full h-full relative overflow-hidden">
            <div className="flex-1 w-full flex flex-col pt-2 overflow-y-auto pb-20">
                {/* Logo header */}
                <div className="flex flex-col items-center w-full mb-4">
                    <div className="relative w-25 h-7">
                        <Image src={LogoIcon} alt="Title Icon" fill className="object-contain" />
                    </div>
                </div>

                {/* Status badge */}
                <div
                    className={`mx-4 mb-4 py-2 px-3 rounded-lg text-center text-[12px] font-medium ${getStatusColor()}`}
                >
                    {getStatusLabel()}
                </div>

                {/* Transaction details */}
                <div className="px-2 space-y-0">
                    {/* Sender */}
                    {ledger.senderAccount && (
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            readOnly
                            containerClassName="w-full"
                            label={t.transfer.receipt.senderAccountNumber}
                            value={`${ledger.senderAccount.accountNumber}  ${ledger.senderAccount.name}`}
                        />
                    )}

                    {/* Receiver */}
                    {counterparty && (
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            readOnly
                            containerClassName="w-full"
                            label={
                                isOutgoing
                                    ? t.transfer.receipt.recipientAccountNumber
                                    : t.transfer.receipt.senderAccountNumber
                            }
                            value={`${counterparty.accountNumber}  ${counterparty.name}`}
                        />
                    )}

                    {/* Amount + Reference row */}
                    <div className="flex gap-2 w-full">
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label={t.transfer.receipt.amountSent}
                            value={`${ledger.amount}`}
                            suffix={ledger.assetSymbol}
                            containerClassName="w-1/2"
                        />
                        {ledger.referenceId && (
                            <Input
                                hideRequired
                                reviewMode
                                disabled
                                label={t.home.qr.enterReference}
                                value={ledger.referenceId}
                                containerClassName="w-1/2"
                            />
                        )}
                    </div>

                    {/* Type + Date row */}
                    <div className="flex gap-2 w-full">
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label={t.home.qr.type}
                            value={getTypeLabel()}
                            className="text-[11px]!"
                            containerClassName="w-1/2"
                        />
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label={t.transfer.receipt.dateTime}
                            value={dateTime}
                            className="text-[11px]!"
                            containerClassName="w-1/2"
                        />
                    </div>

                    {/* Purpose (from metadata) */}
                    {ledger.metadata?.purposeName && (
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label={t.home.qr.selectPurpose}
                            value={ledger.metadata.purposeName}
                            className="text-[11px]!"
                            containerClassName="w-1/2"
                        />
                    )}

                    {/* Fee + Tax row (if non-zero) */}
                    {(ledger.feeAmount > 0 || ledger.taxAmount > 0) && (
                        <div className="flex gap-2 w-full">
                            {ledger.feeAmount > 0 && (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label="Fee"
                                    value={`${ledger.feeAmount} ${ledger.assetSymbol}`}
                                    className="text-[11px]!"
                                    containerClassName="w-1/2"
                                />
                            )}
                            {ledger.taxAmount > 0 && (
                                <Input
                                    hideRequired
                                    reviewMode
                                    disabled
                                    label="Tax"
                                    value={`${ledger.taxAmount} ${ledger.assetSymbol}`}
                                    className="text-[11px]!"
                                    containerClassName="w-1/2"
                                />
                            )}
                        </div>
                    )}

                    {/* Note */}
                    {(ledger.note || ledger.metadata?.note) && (
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label="Note"
                            value={ledger.note || ledger.metadata?.note || ''}
                            className="text-[11px]!"
                        />
                    )}

                    {/* Description */}
                    {ledger.description && (
                        <Input
                            hideRequired
                            reviewMode
                            disabled
                            label="Description"
                            value={ledger.description}
                            className="text-[11px]!"
                        />
                    )}
                </div>
            </div>

            {/* Done button */}
            <div className="absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]">
                <div className="flex items-center justify-center py-4 px-4">
                    <button
                        onClick={onClose}
                        className="flex flex-col cursor-pointer items-center gap-1 text-[#1D1D1D]"
                    >
                        <Image src={DoneIcon} alt="Done" width={24} height={24} />
                        <span className="text-[11px] font-medium">{t.transfer.receipt.done}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetails;
