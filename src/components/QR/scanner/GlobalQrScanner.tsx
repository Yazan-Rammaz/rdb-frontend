'use client';

import React, { useRef, useState } from 'react';
import QrScanner from '../send';
import BottomSheet from '@/components/ui/BottomSheet';
import { useScanner } from '@/context/ScannerContext';
import { useTranslation } from '@/context/I18nContext';
import CreatePaymentRequest from '../receive/CreatePaymentRequest';
import { useStore } from '@/context/StoreContext';
import { validateQR } from '../send/utils';
import type { ParsedQR } from '../send/types';
import { Page } from '@/scaling';

const GlobalQrScanner: React.FC = () => {
    const { t } = useTranslation();
    const { open, setOpen, merchantCode, setOnQrScanned, callOnQrScanned } = useScanner();
    const { balances, activeAssetSymbol, account } = useStore();
    const [parsedQR, setParsedQR] = useState<ParsedQR | null>(null);
    const lastInvalidScanRef = useRef<number>(0);
    const lastHandledScanRef = useRef<number>(0);

    const errorMessages: Record<string, string> = {
        invalid_format: t.home.qr.messages.invalidQrCode,
        missing_both: t.home.qr.messages.missingWalletIdAndCurrency,
        missing_account_info: t.home.qr.messages.missingAccountInfo,
        missing_account_name: t.home.qr.messages.missingAccountName,
        missing_account_number: t.home.qr.messages.missingAccountNumber,
        missing_currency: t.home.qr.messages.missingCurrency,
    };

    /**
     * Returns the error the scanner should show in its camera frame — always a
     * fixed translated string, never any part of the decoded payload — or null
     * when there is nothing new to say (valid scan, or inside a cooldown).
     */
    const handleQrScan = (value: string): string | null => {
        // Cooldown: ignore rapid-fire detections after a successful scan
        const now = Date.now();
        if (now - lastHandledScanRef.current < 3000) return null;

        const result = validateQR(value);

        if (!result.valid) {
            // Cooldown: report at most once every 3s — the camera re-reads the
            // same bad code many times a second.
            if (now - lastInvalidScanRef.current > 3000) {
                lastInvalidScanRef.current = now;
                return errorMessages[result.error] || t.home.qr.messages.invalidQrCode;
            }
            return null;
        }

        // Transfer mode: if a callback is registered, extract account number and hand off
        if (result.data?.accountNumber && callOnQrScanned(result.data.accountNumber)) {
            lastHandledScanRef.current = now;
            return null;
        }

        // Normal flow: show scanned data
        lastHandledScanRef.current = now;
        setParsedQR(result.data);
        return null;
    };

    const handleClose = () => {
        setOpen(null);
        setParsedQR(null);
        setOnQrScanned(null); // clear any pending transfer callback
    };

    if (open === 'receive') {
        return (
            <BottomSheet onClose={handleClose} open={true}>
                <CreatePaymentRequest
                    account={account}
                    balances={balances}
                    activeAssetSymbol={activeAssetSymbol}
                />
            </BottomSheet>
        );
    }

    // Deep link (/home?mrcpay=…): straight to the order, no camera page behind it.
    if (open === 'merchantPay' && merchantCode) {
        return (
            <QrScanner
                open={true}
                onClose={handleClose}
                onScan={handleQrScan}
                merchantCode={merchantCode}
            />
        );
    }

    if (open === 'scan' || open === 'send') {
        return (
            <QrScanner
                open={true}
                onClose={handleClose}
                onScan={handleQrScan}
                parsedQR={parsedQR}
            />
        );
    }

    return null;
};

export default GlobalQrScanner;
