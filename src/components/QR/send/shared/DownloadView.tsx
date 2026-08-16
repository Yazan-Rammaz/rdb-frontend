'use client';

import { forwardRef } from 'react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { formatDateTime } from '../../shared/formatDateTime';
import { useTranslation } from '@/context/I18nContext';
import type { ReceiptData } from './receipt-types';
import TrydosSvg from '@/assets/icons/trydos.svg';
import SuccessSvg from '@/assets/icons/home/transfer/success.svg';

interface DownloadViewProps {
    show: boolean;
    data: ReceiptData;
    screenWidth?: number;
    screenHeight?: number;
}

// Mirrors DetailRow styling (text-xd-11 label / text-xd-13 value / mt-xd-5 gap)
const Row = ({
    label,
    value,
    bold = false,
    icon,
}: {
    label: string;
    value: string;
    bold?: boolean;
    icon?: React.ReactNode;
}) => (
    <div
        style={{
            backgroundColor: '#FCFCFC',
            borderRadius: '15px',
            borderColor: '#D3D3D3',
            padding: '5px',
        }}
    >
        <p style={{ fontSize: '11px', color: '#8D8D8D', fontWeight: 500, margin: 0 }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
            <p
                style={{
                    fontSize: '13px',
                    color: '#1D1D1D',
                    fontWeight: bold ? 700 : 500,
                    margin: 0,
                }}
            >
                {value}
            </p>
            {icon}
        </div>
    </div>
);

const DownloadView = forwardRef<HTMLDivElement, DownloadViewProps>(
    ({ show, data, screenWidth = 430 }, ref) => {
        const { t, language, tr } = useTranslation();

        const dateTime = formatDateTime(data.createdAt, language);
        const displayStatus =
            t.transfer.receipt.statusValue[
                data.status.toLowerCase() as keyof typeof t.transfer.receipt.statusValue
            ] || data.status;

        const cardWidth = Math.min(screenWidth, 430);
        return (
            <div
                ref={ref}
                dir="ltr"
                style={{
                    position: 'fixed',
                    left: show ? '0px' : '-9999px',
                    top: show ? '0px' : '-9999px',
                    width: `${cardWidth}px`,
                    height: '932px',
                    backgroundColor: '#FFFFFF',
                    padding: '120px 30px 120px 30px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'start',
                    alignItems: 'center',
                    flexDirection: 'column',
                    fontFamily: 'Quicksand, sans-serif',
                }}
            >
                {/* Header — trydos logo */}
                <div style={{ textAlign: 'center', margin: '0 0 -10px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={TrydosSvg.src}
                        alt="trydos"
                        style={{ width: '80px', height: '25px', display: 'inline-block' }}
                    />
                </div>

                {/* Title */}
                <div
                    style={{
                        textAlign: 'center',
                        fontSize: '40px',
                        fontWeight: 'lighter',
                        color: '#1D1D1D',
                        fontFamily: 'Quicksand, sans-serif',
                        margin: '0 0 20px',
                    }}
                >
                    {t.transfer.receipt.receiptTitle}
                </div>

                {/* QR Code — mb-xd-8 */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 10px' }}>
                    <QRCodeDisplay value={data.referenceCode} size={70} />
                </div>

                {/* Verification code — text-xd-13, mb-xd-24 */}
                <p
                    style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#1D1D1D',
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 'lighter',
                        margin: '0 0 24px',
                    }}
                >
                    {tr('transfer.receipt.verificationCode', { code: data.referenceCode })}
                </p>

                {/* Detail rows — space-y-xd-16 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <Row
                        label={t.transfer.receipt.senderAccountNumber}
                        value={`${data.senderAccountNumber} ${data.senderMaskedName}`}
                    />
                    <Row
                        label={t.transfer.receipt.recipientAccountNumber}
                        value={`${data.recipientAccountNumber} ${data.recipientMaskedName}`}
                    />
                    <Row
                        label={t.transfer.receipt.recipientAccountName}
                        value={`${data.recipientMaskedName}`}
                    />

                    {/* 2-col grid — gap-y-xd-16 gap-x-xd-48 */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            rowGap: '16px',
                            columnGap: '48px',
                        }}
                    >
                        <Row
                            label={t.transfer.receipt.amountSent}
                            value={`${data.amount} ${data.currency}`}
                            bold
                        />
                        <Row label={t.transfer.receipt.reference} value={data.referenceCode} />
                        <Row label={t.transfer.receipt.dateTime} value={dateTime} />
                        <Row label={t.transfer.receipt.type} value={t.transfer.receipt.typeValue} />
                        <Row label={t.transfer.receipt.purpose} value={data.purposeLabel} />
                        <Row
                            label={t.transfer.receipt.status}
                            value={displayStatus}
                            icon={
                                <img
                                    src={SuccessSvg.src}
                                    alt="success"
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        marginLeft: '8px',
                                        display: 'inline-block',
                                    }}
                                />
                            }
                        />
                    </div>
                </div>

                {/* Marketing footer box */}
                <div
                    style={{
                        marginTop: '24px',
                        display: 'hidden',
                        backgroundColor: '#FCFCFC',
                        borderRadius: '12px',
                        borderColor: '#D3D3D350',
                        borderWidth: '1px',
                        padding: '12px 16px',
                    }}
                >
                    <p
                        style={{
                            fontSize: '11px',
                            color: '#1D1D1D',
                            fontWeight: 'lighter',
                            textAlign: 'center',
                            margin: 0,
                            fontFamily: 'Quicksand, sans-serif',
                            lineHeight: '1.6',
                        }}
                    >
                        You Can Receive The Money Through All Our Centers, Or You Can Download Our
                        Application, Open An Account, Use The Money, And Benefit From All The
                        Services.
                    </p>
                </div>
                <div
                    style={{
                        position: 'absolute',
                        bottom: '16px',
                        width: '100%',
                        textAlign: 'center',
                    }}
                >
                    <p
                        style={{
                            fontSize: 11,
                            color: '#8D8D8D',
                            margin: 0,
                            fontFamily: 'Quicksand, sans-serif',
                        }}
                    >
                        Powered by Ramaaz Digital Banking
                    </p>
                </div>
            </div>
        );
    },
);

DownloadView.displayName = 'DownloadView';

export default DownloadView;
