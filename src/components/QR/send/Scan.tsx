import React, { useCallback, useEffect, useRef, useState } from 'react';
import type QrScannerLib from 'qr-scanner';
import { useTranslation } from '@/context/I18nContext';
import Image from 'next/image';
// Icons
import SendIcon from '@/assets/icons/layout/header/send.svg';
import ReceiveIcon from '@/assets/icons/layout/header/receive.svg';
import ScanIcon from '@/assets/icons/home/qr/smallscanner.svg';
import GalleryIcon from '@/assets/icons/profile/gallery.svg';
import { useScanner } from '@/context/ScannerContext';
import { useToast } from '@/context/ToastContext';

/** Scanner line animation duration */
const SCAN_LINE_DURATION = 2.0;

/** Default camera facing mode */
const DEFAULT_CAMERA: QrScannerLib.FacingMode = 'environment';
const QrScanner: React.FC<{
    onScan: (value: string) => void;
    onClose: () => void;
    onSend?: () => void;
}> = ({ onScan, onClose, onSend }) => {
    // ========== HANDLERS ==========

    // ========== REFS & STATE ==========
    const { t } = useTranslation();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { open: openType, isTransferScan } = useScanner();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDecoding, setIsDecoding] = useState(false);
    const [facingMode, setFacingMode] = useState<QrScannerLib.FacingMode>(DEFAULT_CAMERA);
    const [retryCount, setRetryCount] = useState(0);
    /** Toggle between front and back camera */
    const switchCamera = useCallback(async () => {
        const newMode: QrScannerLib.FacingMode =
            facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(newMode);
        try {
            await scannerRef.current?.setCamera(newMode);
        } catch (err) {
            console.error('Failed to switch camera:', err);
        }
    }, [facingMode]);

    /**
     * Decode a QR code from an image the user picks from their device, then feed the
     * decoded string to the SAME `onScan` callback the camera uses — so validation,
     * routing (payment-request / address / transfer hand-off) and the same-account
     * guard are all reused with no divergent path.
     */
    const handleFileSelected = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            // Reset so re-picking the same file fires onChange again
            e.target.value = '';
            if (!file) {
                return; // picker cancelled — leave the live camera as-is
            }
            if (!file.type.startsWith('image/')) {
                toast.error(t.home.qr.messages.notAnImageFile);
                return;
            }

            setIsDecoding(true);
            try {
                const { default: QrScannerLib } = await import('qr-scanner');
                const result = await QrScannerLib.scanImage(file, {
                    returnDetailedScanResult: true,
                    alsoTryWithoutScanRegion: true,
                });
                if (result?.data) {
                    onScan(result.data);
                } else {
                    toast.error(t.home.qr.messages.noQrInImage);
                }
            } catch (err) {
                const msg = typeof err === 'string' ? err : (err as Error)?.message || '';
                if (msg.includes('No QR code found')) {
                    toast.error(t.home.qr.messages.noQrInImage);
                } else {
                    toast.error(t.home.qr.messages.qrDecodeFailed);
                }
            } finally {
                setIsDecoding(false);
            }
        },
        [onScan, toast, t],
    );

    // ========== EFFECTS ==========

    /**
     * EFFECT: Initialize QR Scanner
     * Sets up camera access and QR code detection with optimized scan region
     */
    useEffect(() => {
        if (!openType) {
            return;
        }

        let isActive = true;

        const startScanner = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Dynamically import QR Scanner library
                const { default: QrScannerLib } = await import('qr-scanner');

                if (scannerRef.current) {
                    scannerRef.current.stop();
                    scannerRef.current.destroy();
                    scannerRef.current = null;
                }

                if (!videoRef.current || !isActive) {
                    return;
                }

                // Initialize scanner with proper options
                scannerRef.current = new QrScannerLib(
                    videoRef.current,
                    (result) => {
                        if (!isActive) {
                            return;
                        }
                        if (result?.data) {
                            onScan(result.data);
                        }
                    },
                    {
                        returnDetailedScanResult: true,
                        preferredCamera: facingMode,
                        maxScansPerSecond: 25,
                        highlightScanRegion: false,
                        highlightCodeOutline: false,
                        calculateScanRegion: (video) => {
                            // Scan the center region of the video
                            const videoWidth = video.videoWidth;
                            const videoHeight = video.videoHeight;
                            const smallerDimension = Math.min(videoWidth, videoHeight);
                            const scanSize = Math.round(smallerDimension * 0.85);
                            const x = Math.round((videoWidth - scanSize) / 2);
                            const y = Math.round((videoHeight - scanSize) / 2);

                            return {
                                x,
                                y,
                                width: scanSize,
                                height: scanSize,
                                downScaledWidth: 400,
                                downScaledHeight: 400,
                            };
                        },
                    },
                );

                // Force selected camera facing mode
                await scannerRef.current.setCamera(facingMode);
                await scannerRef.current.start();

                setIsLoading(false);
            } catch (err: any) {
                console.error('QR scanner error:', err);
                if (isActive) {
                    const msg = err.message || typeof err === 'string' ? err : '';
                    if (msg.includes('Camera not found') || msg.includes('NotFoundError')) {
                        setError(t.home.qr.scanner.CameraNotFound || 'Camera not found');
                    } else {
                        setError(t.home.qr.scanner.UnableToAccessCamera);
                    }
                    setIsLoading(false);
                }
            }
        };

        startScanner();

        return () => {
            isActive = false;
            if (scannerRef.current) {
                scannerRef.current.stop();
                scannerRef.current.destroy();
                scannerRef.current = null;
            }
        };
    }, [openType, onClose, onScan, facingMode, retryCount, t.home.qr.scanner.UnableToAccessCamera]);
    return (
        <div className="w-full h-full flex-1 flex flex-col items-center pt-xd-8">
            {/* Scanner Frame Container */}
            <div
                className={`relative size-xd-350 max-w-full bg-[#000000] rounded-xd-30 overflow-hidden ${isLoading ? '' : 'shadow-2xl'}`}
            >
                {/* Video Stream */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                />

                {/* Camera Switch Indicator Overlay (Conditional) */}
                {!isLoading && (
                    <button
                        onClick={switchCamera}
                        className="absolute top-xd-24 end-xd-24 z-20 size-xd-40 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md active:bg-white/30 transition-all border border-white/30"
                        aria-label={t.common.accessibility.switchCamera}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="m18 22-3-3 3-3" />
                        </svg>
                    </button>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="size-xd-40 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {/* Scan Icon & Text - Positioned at Bottom */}
                <div className="absolute bottom-xd-12 inset-x-0 z-10 flex flex-col items-center gap-xd-19 px-xd-12">
                    <div className="size-xd-25 flex items-center justify-center text-white">
                        <Image
                            src={ScanIcon}
                            alt="Scan"
                            width={25}
                            height={25}
                            className="opacity-90 grayscale brightness-200"
                        />
                    </div>
                    <p className="text-[#FCFCFC] text-xd-11 font-normal text-center leading-xd-11 opacity-90">
                        {t.home.qr.scanner.readCode}
                    </p>
                </div>
            </div>

            {/* Status / Error Message */}
            {error && (
                <div className="mt-4 px-4 py-2 bg-red-50 rounded-full border border-red-100 flex items-center gap-3">
                    <p className="text-red-500 text-xs font-medium flex-1">{error}</p>
                </div>
            )}

            {/* Upload QR from gallery — available in every scan mode.
                Reuses the Send/Receive row recipe: same colors, fonts and spacing. */}
            <div className="w-full max-w-xd-406 mx-auto px-xd-12 mt-xd-14">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileSelected}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDecoding}
                    className="cursor-pointer w-full h-xd-67 flex items-center gap-xd-14 ps-xd-12 pe-xd-14 bg-[#F8F8F8] rounded-xd-15 transition-colors group disabled:opacity-60"
                >
                    <div className="size-xd-25 rounded-xd-8 flex items-center justify-center shadow-sm shrink-0">
                        {isDecoding ? (
                            <div className="size-xd-19 border-2 border-[#D3D3D3] border-t-[#1D1D1D] rounded-full animate-spin" />
                        ) : (
                            <Image src={GalleryIcon} alt="Gallery" width={25} height={25} />
                        )}
                    </div>
                    <div className="flex-1 text-left flex flex-col justify-center">
                        <h3 className="text-[#1D1D1D] text-xd-13 pt-xd-2 font-medium leading-xd-16">
                            {t.home.qr.scanner.uploadFromGallery}
                        </h3>
                        <p className="text-[#8D8D8D] pt-xd-4 text-xd-11 font-normal leading-xd-12">
                            {t.home.qr.scanner.uploadDescription}
                        </p>
                    </div>
                </button>
            </div>

            {/* Spacer to push upcoming content to bottom */}
            <div className="flex-1" />

            {/* Action Section */}
            {openType === 'send' && !isTransferScan && (
                <div className="relative w-full h-xd-225 px-xd-12 flex flex-col">
                    <div className="absolute top-0 inset-x-0 h-px bg-[#D3D3D3] origin-top scale-y-50 pointer-events-none" />
                    <div className="mt-xd-14 mb-xd-14 h-xd-17 text-center text-xd-13 leading-xd-17 font-normal text-[#1D1D1D]">
                        {t.home.qr.scanner.orChoose}
                    </div>

                    <div className="w-full max-w-xd-406 mx-auto flex flex-col gap-xd-5 pb-xd-40">
                        {/* Send Button */}
                        <button
                            onClick={onSend}
                            className="cursor-pointer w-full h-xd-67 flex items-center gap-xd-14 ps-xd-12 pe-xd-14 bg-[#F8F8F8] rounded-xd-15 transition-colors group"
                        >
                            <div className="size-xd-25 rounded-xd-8 flex items-center justify-center shadow-sm shrink-0">
                                <Image src={SendIcon} alt="Send" width={25} height={25} />
                            </div>
                            <div className="flex-1 text-left flex flex-col justify-center">
                                <h3 className="text-[#1D1D1D] text-xd-13 pt-xd-2 font-medium leading-xd-16">
                                    {t.home.qr.scanner.sendTitle}
                                </h3>
                                <p className="text-[#8D8D8D] pt-xd-4 text-xd-11 font-normal leading-xd-12">
                                    {t.home.qr.scanner.sendDescription}
                                </p>
                            </div>
                        </button>

                        {/* Receive Button */}
                        <button className="cursor-pointer w-full h-xd-67 flex items-center gap-xd-14 ps-xd-12 pe-xd-14 bg-[#F8F8F8] rounded-xd-15 transition-colors group">
                            <div className="size-xd-25 rounded-xd-8 flex items-center justify-center shadow-sm shrink-0">
                                <Image src={ReceiveIcon} alt="Receive" width={25} height={25} />
                            </div>
                            <div className="flex-1 text-left flex flex-col justify-center">
                                <h3 className="text-[#1D1D1D] text-xd-13 mt-xd-2 font-medium leading-xd-16">
                                    {t.home.qr.scanner.receiveTitle}
                                </h3>
                                <p className="text-[#8D8D8D] mt-xd-4 text-xd-11 font-normal leading-xd-12">
                                    {t.home.qr.scanner.receiveDescription}
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QrScanner;
