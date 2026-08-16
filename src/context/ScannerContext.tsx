'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ScannerNav {
    toScan?: () => void;
    toTransfer?: () => void;
    toPaymentRequest?: () => void;
}

interface ScannerContextType {
    open: 'scan' | 'receive' | 'send' | null;
    setOpen: (open: 'scan' | 'receive' | 'send' | null) => void;
    // Cleanup: clear callback if scanner is closed without scanning
    setOnQrScanned: (callback: ((value: string) => void) | null) => void;
    // Register page navigation fns from the active QrScanner
    setScannerNav: (nav: ScannerNav) => void;
    // Navigate camera page within current BottomSheet and set callback
    openScannerWithCallback: (callback: (value: string) => void) => void;
    // Call pending transfer callback (if any); returns true when handled
    callOnQrScanned: (value: string) => boolean;
    // True when scanner was opened from transfer page for scanning
    isTransferScan: boolean;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export const ScannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState<'scan' | 'receive' | 'send' | null>(null);
    const [isTransferScan, setIsTransferScan] = useState(false);
    const onQrScannedRef = useRef<((value: string) => void) | null>(null);
    const scannerNavRef = useRef<ScannerNav>({});

    const setOnQrScanned = useCallback((cb: ((value: string) => void) | null) => {
        onQrScannedRef.current = cb;
        if (!cb) setIsTransferScan(false);
    }, []);

    const setScannerNav = useCallback((nav: ScannerNav) => {
        scannerNavRef.current = nav;
    }, []);

    const openScannerWithCallback = useCallback((callback: (value: string) => void) => {
        onQrScannedRef.current = callback;
        setIsTransferScan(true);
        scannerNavRef.current.toScan?.();
    }, []);

    // Returns true if a transfer callback was pending (called it + navigated back to TransferSend)
    const callOnQrScanned = useCallback((value: string): boolean => {
        if (onQrScannedRef.current) {
            onQrScannedRef.current(value);
            onQrScannedRef.current = null;
            setIsTransferScan(false);
            scannerNavRef.current.toTransfer?.();
            return true;
        }
        return false;
    }, []);

    return (
        <ScannerContext.Provider
            value={{
                open,
                setOpen,
                setOnQrScanned,
                setScannerNav,
                openScannerWithCallback,
                callOnQrScanned,
                isTransferScan,
            }}
        >
            {children}
        </ScannerContext.Provider>
    );
};

export const useScanner = () => {
    const context = useContext(ScannerContext);
    if (context === undefined) {
        throw new Error('useScanner must be used within a ScannerProvider');
    }
    return context;
};
