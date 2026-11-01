'use client';

import React, { forwardRef } from 'react';
import LogoIcon from '@/assets/icons/home/qr/title.svg';
import Image from 'next/image';
import { CustomQRCode } from '@/components/ui/CustomQR';
import { getPurposeLabel, buildValidityLabel } from '../utils';
import { useTranslation } from '@/context/I18nContext';
import type { FormData, Mode, SelectOption } from '../types';

interface DownloadViewProps {
    formData: FormData;
    qrValue: string;
    purposes: SelectOption[];
    validities: SelectOption[];
    mode?: Mode;
}

const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    color: '#8D8D8D',
    fontWeight: 500,
    fontFamily: 'Quicksand, sans-serif',
    margin: 0,
};

const fieldValue: React.CSSProperties = {
    fontSize: 13,
    color: '#1D1D1D',
    fontWeight: 500,
    fontFamily: 'Quicksand, sans-serif',
    margin: '2px 0 0',
    wordBreak: 'break-word',
};

const fieldBox: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '8px 12px',
    borderRadius: 12,
    boxShadow: '0 0 0 0.5px #D3D3D3',
    backgroundColor: '#fff',
};

const DownloadView = forwardRef<HTMLDivElement, DownloadViewProps>(
    ({ qrValue, purposes, validities, formData, mode = 'address' }, ref) => {
        const { t } = useTranslation();
        const purposeLabel = getPurposeLabel(formData.purpose, purposes);
        const validityLabel = buildValidityLabel(formData.validity, validities);

        return (
            <div
                ref={ref}
                dir="ltr"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 430,
                    minHeight: 932,
                    backgroundColor: '#FFFFFF',
                    padding: '60px 25px',
                    fontFamily: 'Quicksand, sans-serif',
                    justifyContent: 'center',
                    gap: 40,
                }}
            >
                {/* Top section */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        gap: 0,
                    }}
                >
                    <div style={{ position: 'relative', width: 110, height: 34 }}>
                        <Image
                            src={LogoIcon}
                            alt="Title Icon"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                    <div
                        style={{
                            width: 280,
                            height: 260,
                            marginTop: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CustomQRCode errorCorrectionLevel="L" value={qrValue} size={260} />
                    </div>

                    {/* Account number under QR */}
                    <p
                        style={{
                            marginTop: 0,
                            fontSize: 13,
                            color: '#1D1D1D',
                            fontWeight: 400,
                            fontFamily: 'Quicksand, sans-serif',
                            letterSpacing: 0.5,
                        }}
                    >
                        {formData.accountNumber}
                    </p>

                    <div
                        style={{
                            paddingTop: 20,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            paddingLeft: 0,
                            paddingRight: 0,
                        }}
                    >
                        <div style={fieldBox}>
                            <p style={fieldLabel}>{t.home.deposit.accountName}</p>
                            <p style={fieldValue}>{formData.displayedAccountName}</p>
                        </div>
                        <div style={fieldBox}>
                            <p style={fieldLabel}>{t.home.deposit.accountNumber}</p>
                            <p style={fieldValue}>
                                {formData.accountNumber} {formData.currency}
                            </p>
                        </div>
                    </div>

                    {mode === 'review' && (
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                paddingTop: 8,
                                paddingLeft: 0,
                                paddingRight: 0,
                            }}
                        >
                            {/* Amount + Reference */}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div style={fieldBox}>
                                    <p style={fieldLabel}>{t.home.qr.enterAmount}</p>
                                    <p style={fieldValue}>
                                        {formData.amount} {formData.currency}
                                    </p>
                                </div>
                                {formData.reference && (
                                    <div style={fieldBox}>
                                        <p style={fieldLabel}>{t.home.qr.enterReference}</p>
                                        <p style={fieldValue}>{formData.reference}</p>
                                    </div>
                                )}
                            </div>

                            {/* Purpose + Type */}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div style={fieldBox}>
                                    <p style={fieldLabel}>{t.home.qr.selectPurpose}</p>
                                    <p style={fieldValue}>{purposeLabel}</p>
                                </div>
                                <div style={fieldBox}>
                                    <p style={fieldLabel}>{t.home.qr.type}</p>
                                    <p style={fieldValue}>{t.home.qr.paymentRequest}</p>
                                </div>
                            </div>

                            {/* Note */}
                            {formData.note && (
                                <div style={fieldBox}>
                                    <p style={fieldLabel}>Note</p>
                                    <p style={fieldValue}>{formData.note}</p>
                                </div>
                            )}

                            {/* Valid Until */}
                            <div style={fieldBox}>
                                <p style={fieldLabel}>{t.home.qr.validUntil}</p>
                                <p style={fieldValue}>{validityLabel}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom */}
                <div style={{ textAlign: 'center' }}>
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
