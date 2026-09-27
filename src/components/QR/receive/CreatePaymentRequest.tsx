import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useXdScale } from '@/scaling';
import LogoIcon from '@/assets/icons/home/qr/title.svg';
import Image from 'next/image';
import { CustomQRCode } from '@/components/ui/CustomQR';
import { ActionButtons } from './ActionButtons';
import html2canvas from 'html2canvas';
import { BalancesMap } from '@/context/StoreContext';
import { useTranslation } from '@/context/I18nContext';
import { useTransferPurposes } from '@/hooks/useTransferPurposes';
import { usePaymentRequestAPI } from '@/hooks/usePaymentRequestAPI';
import { useIsOnline } from '@/hooks/useIsOnline';
import { useInlineFeedback } from '@/hooks/useInlineFeedback';
import InlineFeedback from '@/components/ui/InlineFeedback';
import { buildPaymentRequestQr } from '@/lib/paymentRequestQr';
import { RequestView } from './views/RequestView';
import { type FieldValidationConfig, validateField } from '@/components/ui/field-error';
import { ReviewView } from './views/ReviewView';
import DownloadView from './views/DownloadView';
import { maskString } from './utils';
import { shareQRImage } from '../shared/shareQRImage';
import type { FormData, Mode, SelectOption } from './types';

// Re-export for backwards compatibility with external imports
export type { FormData as FormDataTypes } from './types';

/** Convert validity option ID to API fields */
function validityToApiFields(validity: string): { expiryMinutes?: number; isPermanent: boolean } {
    switch (validity) {
        case 'Always':
            return { isPermanent: true };
        case '1m':
            return { expiryMinutes: 1, isPermanent: false };
        case '3m':
            return { expiryMinutes: 3, isPermanent: false };
        case '15m':
            return { expiryMinutes: 15, isPermanent: false };
        case '1h':
            return { expiryMinutes: 60, isPermanent: false };
        case '24h':
            return { expiryMinutes: 1440, isPermanent: false };
        default:
            return { isPermanent: true };
    }
}

const CreatePaymentRequest = ({
    account,
    balances,
    activeAssetSymbol,
}: {
    account: { name: string; type: string; number: string };
    balances: BalancesMap;
    activeAssetSymbol?: string;
}) => {
    const scale = useXdScale();
    const { t } = useTranslation();
    // One line for every result on this screen. Where it shows depends on the
    // mode: under the account number (address / review), or above Generate
    // (request) — see the two <InlineFeedback> slots below.
    const {
        feedback,
        success: showSuccess,
        error: showError,
        clear: clearFeedback,
    } = useInlineFeedback();
    const { purposes } = useTransferPurposes();
    const isOnline = useIsOnline();
    const downloadRef = useRef<HTMLDivElement>(null);

    // Derive account info from props BEFORE any hooks that depend on them
    const accountName = account?.name || '';
    const accountNumber = account?.number || '';

    const {
        createPaymentRequest,
        lookupPaymentRequest,
        isLoading: isApiLoading,
    } = usePaymentRequestAPI();

    const [mode, setMode] = useState<Mode>('address');
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [hideQR, setHideQR] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
    const [showName, setShowName] = useState(true);
    const [requestExpiresAt, setRequestExpiresAt] = useState<string | null>(null);
    const [requestIsPermanent, setRequestIsPermanent] = useState(false);
    const [requestCode, setRequestCode] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    const activeBalance = activeAssetSymbol ? balances[activeAssetSymbol] : undefined;
    const accountType = account?.type || '';

    const validities: SelectOption[] = [
        { id: 'Always', label: t.home.qr.validity.always },
        { id: '1m', label: t.home.qr.validity.m1 },
        { id: '3m', label: t.home.qr.validity.m3 },
        { id: '15m', label: t.home.qr.validity.m15 },
        { id: '1h', label: t.home.qr.validity.h1 },
        { id: '24h', label: t.home.qr.validity.h24 },
    ];

    const [formData, setFormData] = useState<FormData>({
        accountName: accountName,
        accountNumber: accountNumber,
        currency: activeAssetSymbol || 'USD',
        amount: '',
        reference: '',
        purpose: '',
        validity: 'Always',
        note: '',
        displayedAccountName: accountName,
    });

    // Sync account info when active balance changes
    useEffect(() => {
        if (activeBalance) {
            setFormData((prev) => ({
                ...prev,
                accountName,
                accountNumber,
                currency: activeAssetSymbol || prev.currency,
                displayedAccountName: showName ? accountName : maskString(accountName),
            }));
        }
    }, [activeBalance, activeAssetSymbol, accountName, accountNumber, showName]);

    // --- Validation ---
    const validationConfig: Record<string, FieldValidationConfig> = {
        amount: {
            isRequired: true,
            requiredMessage: t.home.qr.validation.amountRequired,
            conditions: [
                {
                    check: (v) => !!v && parseFloat(v) <= 0,
                    message: t.home.qr.validation.insufficientBalance,
                    type: 'warn',
                },
            ],
        },
        purpose: {
            isRequired: true,
            requiredMessage: t.home.qr.validation.purposeRequired,
        },
        validity: {
            isRequired: true,
            requiredMessage: t.home.qr.validation.validityRequired,
        },
    };

    const errors = {
        amount: validateField(validationConfig.amount, formData.amount, !!touched.amount),
        purpose: validateField(validationConfig.purpose, formData.purpose, !!touched.purpose),
        validity: validateField(validationConfig.validity, formData.validity, !!touched.validity),
    };

    const isFormValid =
        !!formData.amount &&
        !!formData.purpose &&
        !!formData.validity &&
        !validateField(validationConfig.amount, formData.amount, true) &&
        !validateField(validationConfig.purpose, formData.purpose, true) &&
        !validateField(validationConfig.validity, formData.validity, true);

    // --- QR generation ---
    const generateQrValue = useCallback(
        async ({ cU, isForceRequest = false }: { cU?: string; isForceRequest?: boolean }) => {
            const aNa = accountName || formData.accountName;
            const aNu = accountNumber || formData.accountNumber;
            const cUr = cU || formData.currency;

            if (!aNa || aNa === 'null') {
                setHideQR(true);
                setQrValue(null);
                return false;
            }

            if (mode === 'request' || isForceRequest) {
                // Call real backend API to create payment request
                const { expiryMinutes, isPermanent } = validityToApiFields(formData.validity);
                const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                // dont paass expiryMinutes if not returnd from validityToApiFields
                const result = await createPaymentRequest({
                    accountNumber: aNu,
                    assetType: 'CURRENCY',
                    assetSymbol: cUr,
                    amount: parseFloat(formData.amount) || 0,
                    purposeId: formData.purpose,
                    note: formData.note || undefined,
                    reference: formData.reference || undefined,
                    expiryMinutes: expiryMinutes !== undefined ? expiryMinutes : undefined,
                    isPermanent,
                    idempotencyKey,
                });

                if ('error' in result) {
                    // No connection: silent — the offline pill is the message.
                    if (result.network) return 'network' as const;
                    // The hook no longer reports it — this line is the only report.
                    showError(result.error);
                    return 'failed' as const;
                }

                setQrValue(buildPaymentRequestQr(result.requestCode, aNu));
                setHideQR(false);
                setRequestCode(result.requestCode);
                setRequestExpiresAt(result.isPermanent ? null : (result.expiresAt ?? null));
                setRequestIsPermanent(result.isPermanent);

                return true;
            }

            // Address mode: QR shows account info for regular transfers
            const params = new URLSearchParams();
            params.set('ana', aNa);
            params.set('anu', aNu);
            params.set('cu', cUr);

            setQrValue(params.toString());
            setHideQR(false);
            return true;
        },
        [formData, mode, accountName, accountNumber, createPaymentRequest, showError],
    );

    const handleRequest = useCallback(
        ({
            cU,
            notify = false,
            isForceRequest = false,
        }: {
            cU?: string;
            notify?: boolean;
            isForceRequest?: boolean;
        }) => {
            return (async () => {
                const outcome = await generateQrValue({ cU, isForceRequest });
                // 'network' is silent (offline pill); 'failed' has already shown
                // the server's message — neither is a missing wallet.
                if (outcome === 'network' || outcome === 'failed') return false;

                if (!outcome) {
                    if (notify) {
                        showError(t.home.qr.messages.noWalletIdAvailable);
                    }
                    return false;
                }

                if (notify) {
                    showSuccess(t.home.qr.messages.qrGenerated);
                }

                return true;
            })();
        },
        [generateQrValue, showError, showSuccess, t],
    );

    // Generate initial QR for address mode when account info or currency becomes available
    useEffect(() => {
        if (accountName && accountNumber && mode === 'address') {
            void handleRequest({ cU: activeAssetSymbol });
        }
    }, [accountName, accountNumber, activeAssetSymbol, handleRequest]);

    // --- Actions ---
    const touchAll = () => setTouched({ amount: true, purpose: true, validity: true });
    const onFieldTouch = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

    const handleGenerate = () => {
        touchAll();
        if (!isFormValid || isGenerating || isApiLoading || !isOnline) return;
        setIsGenerating(true);
        void handleRequest({ notify: true, isForceRequest: true }).then((success) => {
            setIsGenerating(false);
            if (success) {
                setMode('review');
            }
        });
    };

    /** Render the off-screen DownloadView and capture it as a canvas */
    const captureCanvas = (): Promise<HTMLCanvasElement | null> => {
        return new Promise((resolve) => {
            if (!qrValue) {
                resolve(null);
                return;
            }
            setShowPreview(true);
            requestAnimationFrame(async () => {
                if (!downloadRef.current) {
                    setShowPreview(false);
                    resolve(null);
                    return;
                }
                try {
                    const canvas = await html2canvas(downloadRef.current, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                    });
                    resolve(canvas);
                } catch {
                    resolve(null);
                } finally {
                    setShowPreview(false);
                }
            });
        });
    };

    const handleDownload = async () => {
        if (!qrValue) {
            showError(t.home.qr.messages.qrDownloadError);
            return;
        }
        const canvas = await captureCanvas();
        if (!canvas) {
            showError(t.home.qr.messages.qrDownloadFailed);
            return;
        }
        const link = document.createElement('a');
        link.download = `deposit-qr-${formData.accountNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showSuccess(t.home.qr.messages.qrDownloadSuccess);
    };

    const handleShare = async () => {
        if (!qrValue) {
            showError(t.home.qr.messages.qrDownloadError);
            return;
        }
        const canvas = await captureCanvas();
        if (!canvas) {
            showError(t.home.qr.messages.qrDownloadFailed);
            return;
        }
        const result = await shareQRImage(
            canvas,
            `Deposit QR — ${formData.accountNumber}`,
            `Account: ${formData.accountName}\nNumber: ${formData.accountNumber}`,
        );
        if (result === 'shared') {
            showSuccess(t.home.qr.messages.qrShareSuccess);
        } else if (result === 'copied') {
            showSuccess(t.home.qr.messages.qrCopied);
        }
        // 'dismissed' — user closed the share sheet; nothing to say
    };

    const handleCopy = async () => {
        if (!qrValue) return;
        try {
            await navigator.clipboard.writeText(qrValue);
            showSuccess(t.home.qr.messages.qrCopied);
        } catch {
            showError(t.home.qr.messages.qrCopyFailed);
        }
    };

    const updateField = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleExpired = useCallback(async () => {
        if (requestCode) {
            try {
                const result = await lookupPaymentRequest(requestCode);
                if (!('error' in result)) {
                    // confirmed by server
                }
            } catch {
                // fall through
            }
        }
        setIsExpired(true);
    }, [requestCode, lookupPaymentRequest]);

    return (
        <div
            className={`flex flex-col items-center w-full max-w-xd-430 mx-auto h-full relative overflow-hidden transition-colors duration-500 ${mode === 'review' && isExpired ? 'bg-[#FDF3F3]' : 'bg-background'}`}
        >
            <div className="flex-1 w-full flex flex-col overflow-hidden">
                <div className="relative flex flex-col items-center w-full">
                    <div className="relative w-xd-97 h-xd-30 mt-xd-10 mb-xd-19">
                        <Image src={LogoIcon} alt="Title Icon" fill className="object-contain" />
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                        <div
                            className={hideQR || isExpired ? 'opacity-10 bg-white rounded-xl' : ''}
                        >
                            <CustomQRCode
                                errorCorrectionLevel="L"
                                value={qrValue || ''}
                                size={Math.round(250 * scale)}
                            />
                        </div>
                        <p
                            className={`text-xd-16 leading-xd-16 font-medium text-[#1D1D1D] text-center mt-xd-7 ${mode === 'request' ? 'mb-xd-15' : 'mb-xd-45'}`}
                        >
                            {isExpired ? 'Expired Code ( Time Expired )' : formData.accountNumber}
                        </p>
                    </div>

                    {/* Slot A (address / review): the account number's empty
                        mb-xd-45 margin, under the QR. Out of flow — nothing moves. */}
                    {mode !== 'request' && (
                        <InlineFeedback
                            feedback={feedback}
                            className="absolute inset-x-0 bottom-0 h-xd-45 items-center px-xd-25"
                        />
                    )}
                </div>

                <div className="flex-1 relative overflow-hidden flex flex-col">
                    {mode === 'review' ? (
                        <ReviewView
                            updateField={updateField}
                            purposes={purposes}
                            validities={validities}
                            formData={formData}
                            showName={showName}
                            expiresAt={requestExpiresAt}
                            isPermanent={requestIsPermanent}
                            onExpired={handleExpired}
                        />
                    ) : (
                        <RequestView
                            purposes={purposes}
                            validities={validities}
                            mode={mode}
                            formData={formData}
                            updateField={updateField}
                            errors={errors}
                            onFieldTouch={onFieldTouch}
                            onGenerate={handleGenerate}
                            onCancel={() => {
                                clearFeedback();
                                setHideQR(false);
                                setMode('address');
                                setTouched({});
                            }}
                        />
                    )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-background border-0 border-[#F2F2F2]">
                    {/* Slot B (request mode): the action row's empty pt-xd-20, above Generate. */}
                    {mode === 'request' && (
                        <InlineFeedback
                            feedback={feedback}
                            lines={1}
                            className="absolute inset-x-0 top-0 h-xd-20 items-center px-xd-25"
                        />
                    )}
                    {!isExpired && (
                        <ActionButtons
                            // Offline, Generate reads as not ready (grey, disabled).
                            isFormValid={isFormValid && isOnline}
                            mode={mode}
                            isLoading={isGenerating || isApiLoading}
                            onRequest={() => {
                                clearFeedback();
                                setHideQR(true);
                                setMode('request');
                            }}
                            onCopy={handleCopy}
                            onDownload={handleDownload}
                            onShare={handleShare}
                            onGenerate={handleGenerate}
                            onCancel={() => {
                                clearFeedback();
                                setHideQR(false);
                                setMode('address');
                                setTouched({});
                            }}
                        />
                    )}
                </div>

                {showPreview && (
                    <div className="fixed max-w-100 -left-2499.75 top-0 h-full" aria-hidden="true">
                        <DownloadView
                            formData={formData}
                            ref={downloadRef}
                            qrValue={qrValue || ''}
                            purposes={purposes}
                            validities={validities}
                            mode={mode}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatePaymentRequest;
