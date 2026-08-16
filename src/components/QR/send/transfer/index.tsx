'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useActions } from '@/hooks/useActions';
import { api } from '@/api';
import type { TransferResult } from '@/api';
import { resolveRecipient } from '@/api/helpers/resolveRecipient';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { useScanner } from '@/context/ScannerContext';
import { useStepUp, extractStepUp } from '@/hooks/useStepUp';
import SenderCard from './SenderCard';
import RecipientInput from './RecipientInput';
import AmountInput from './AmountInput';
import PurposeSelect from './PurposeSelect';
import TransferSuccess from './TransferSuccess';
import { initialFormState } from './types';
import type { TransferFormState } from './types';
import TitleIcon from '@/assets/icons/home/qr/sendT.svg';
import TransferIcon from '@/assets/icons/home/transfer/transfer.svg';
import TransferDisabledIcon from '@/assets/icons/home/transfer/transferdisabled.svg';
import { useTranslation } from '@/context/I18nContext';

interface TransferSendProps {
    onClose: () => void;
    prefillAccountNumber?: string;
    prefillCurrencySymbol?: string;
}

const TransferSend: React.FC<TransferSendProps> = ({
    onClose,
    prefillAccountNumber,
    prefillCurrencySymbol,
}) => {
    const actions = useActions();
    const { activeAssetSymbol, activeAssetType, balances, refreshTransactions, refreshBalances } =
        useStore();
    const { toast } = useToast();
    const { openScannerWithCallback } = useScanner();
    const { satisfyStepUp } = useStepUp();
    const { t, tr } = useTranslation();

    const [form, setForm] = useState<TransferFormState>(initialFormState);
    const [selectedPurposeName, setSelectedPurposeName] = useState('');
    const [amountFocusTrigger, setAmountFocusTrigger] = useState(0);

    // Auto-focus amount input when account is confirmed
    useEffect(() => {
        if (form.accountConfirmed) {
            setAmountFocusTrigger((n) => n + 1);
        }
    }, [form.accountConfirmed]);

    // Flag to trigger validation after QR scan
    const [pendingQrValidation, setPendingQrValidation] = useState<string | null>(null);
    // Flag to trigger validation after paste
    const [pendingPasteValidation, setPendingPasteValidation] = useState<string | null>(null);
    const recipientValidateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resolvedAssetSymbol = prefillCurrencySymbol || activeAssetSymbol || 'USD';
    const senderBalance =
        balances[resolvedAssetSymbol] ||
        (activeAssetSymbol ? balances[activeAssetSymbol] : undefined);
    const assetSymbol = resolvedAssetSymbol;
    const assetType = activeAssetType?.toUpperCase() || 'CURRENCY';
    const senderAccountNumber = senderBalance?.accountNumber || '1000-1128';
    const senderMaskedName = 'M***** A*****';

    // Account number validation (client-side) - strict format: xxxx-xxxx
    const validateAccountFormat = (value: string): string | null => {
        if (!value) return null;
        if (!/^\d{4}-\d{4}$/.test(value)) {
            return t.transfer.error.incorrectFormat;
        }
        return null;
    };

    // Validate account by number (used for QR scan)
    const validateAccountByNumber = useCallback(
        async (accountNumber: string) => {
            const value = accountNumber.trim();
            if (!value) return;

            const formatError = validateAccountFormat(value);
            if (formatError) {
                setForm((prev) => ({ ...prev, accountError: formatError }));
                return;
            }

            setForm((prev) => ({
                ...prev,
                isValidatingAccount: true,
                accountError: null,
                currencyWarning: null,
            }));

            try {
                const cleaned = value.replace(/-/g, '');
                const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                const result = await resolveRecipient(formatted);

                if (!result.ok) {
                    setForm((prev) => ({
                        ...prev,
                        isValidatingAccount: false,
                        accountError: result.message,
                        recipientDetails: null,
                        accountConfirmed: false,
                    }));
                } else {
                    setForm((prev) => ({
                        ...prev,
                        isValidatingAccount: false,
                        recipientDetails: result.recipient,
                        accountConfirmed: true,
                        accountError: null,
                        currencyWarning: null,
                    }));
                }
            } catch {
                setForm((prev) => ({
                    ...prev,
                    isValidatingAccount: false,
                    accountError: t.transfer.error.validateAccount,
                }));
            }
        },
        [actions],
    );

    // Effect to handle pending QR validation
    useEffect(() => {
        if (pendingQrValidation) {
            validateAccountByNumber(pendingQrValidation);
            setPendingQrValidation(null);
        }
    }, [pendingQrValidation, validateAccountByNumber]);

    // Effect to handle pending paste validation
    useEffect(() => {
        if (pendingPasteValidation) {
            validateAccountByNumber(pendingPasteValidation);
            setPendingPasteValidation(null);
        }
    }, [pendingPasteValidation, validateAccountByNumber]);

    // Pre-fill account number when opened from regular account QR scan
    useEffect(() => {
        if (prefillAccountNumber) {
            setForm({
                ...initialFormState,
                recipientAccountNumber: prefillAccountNumber,
                inputMethod: 'QR',
            });
            setSelectedPurposeName('');
            setPendingQrValidation(prefillAccountNumber);
        }
    }, [prefillAccountNumber]);

    // Auto-validate 0.5 seconds after user types a complete account number (xxxx-xxxx = 9 chars)
    useEffect(() => {
        const value = form.recipientAccountNumber;

        if (recipientValidateDebounceRef.current) {
            clearTimeout(recipientValidateDebounceRef.current);
            recipientValidateDebounceRef.current = null;
        }

        if (
            form.accountConfirmed ||
            form.isValidatingAccount ||
            form.editingAfterConfirm ||
            form.accountError
        )
            return;
        if (form.recipientInputMode !== 'account') return;
        if (/^\d{4}-\d{4}$/.test(value)) {
            recipientValidateDebounceRef.current = setTimeout(() => {
                validateAccountByNumber(value);
            }, 500);
        }

        return () => {
            if (recipientValidateDebounceRef.current) {
                clearTimeout(recipientValidateDebounceRef.current);
                recipientValidateDebounceRef.current = null;
            }
        };
    }, [
        form.recipientAccountNumber,
        form.accountConfirmed,
        form.isValidatingAccount,
        form.editingAfterConfirm,
        form.accountError,
        form.recipientInputMode,
        validateAccountByNumber,
    ]);

    // Validate recipient account via API
    const handleValidateAccount = useCallback(async () => {
        const value = form.recipientAccountNumber.trim();
        if (!value) return;

        // In account mode, require xxxx-xxxx format before any API lookup.
        if (form.recipientInputMode === 'account') {
            const formatError = validateAccountFormat(value);
            if (formatError) {
                setForm((prev) => ({ ...prev, accountError: formatError }));
                return;
            }
        }

        setForm((prev) => ({
            ...prev,
            isValidatingAccount: true,
            accountError: null,
            currencyWarning: null,
        }));

        try {
            let result: Awaited<ReturnType<typeof resolveRecipient>>;
            if (form.recipientInputMode === 'phone') {
                // NOT migrated to @/api on purpose: lookupAccountByPhone has no
                // backend. It is a hardcoded mock — a 1.5s sleep and one
                // recognised number — so there is no endpoint to describe. It
                // stays an action until a real phone-lookup route exists.
                const phone = await actions.banking.lookupAccountByPhone({ phoneNumber: value });
                result =
                    'error' in phone
                        ? { ok: false, message: phone.error }
                        : { ok: true, recipient: phone };
            } else {
                // Format as xxxx-xxxx for the API
                const cleaned = value.replace(/-/g, '');
                const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                result = await resolveRecipient(formatted);
            }

            if (!result.ok) {
                setForm((prev) => ({
                    ...prev,
                    isValidatingAccount: false,
                    accountError: result.message,
                    recipientDetails: null,
                    accountConfirmed: false,
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    isValidatingAccount: false,
                    recipientDetails: result.recipient,
                    accountConfirmed: true,
                    accountError: null,
                    currencyWarning: null,
                }));
            }
        } catch {
            setForm((prev) => ({
                ...prev,
                isValidatingAccount: false,
                accountError: t.transfer.error.validateAccount,
            }));
        }
    }, [form.recipientAccountNumber, form.recipientInputMode, actions]);

    // Validate amount via verify API
    const handleValidateAmount = useCallback(async () => {
        const value = form.amount.trim();
        if (!value || !form.recipientDetails) return;

        const numAmount = parseFloat(value);
        if (isNaN(numAmount) || numAmount <= 0) {
            setForm((prev) => ({ ...prev, amountError: t.transfer.error.invalidAmount }));
            return;
        }

        setForm((prev) => ({ ...prev, isCheckingBalance: true, amountError: null }));
        console.log(
            'Verifying transfer with amount:',
            numAmount,
            'to account:',
            form.recipientDetails.accountNumber,
            'asset:',
            assetSymbol,
            'type:',
            assetType,
        );
        try {
            // `senderAvailableBalance` is no longer passed: the old action
            // destructured it but never put it in the request body, so it was
            // dead weight. The balance check below uses the value the server
            // returns, which is the authoritative one.
            const res = await api.transfers.verify({
                toAccountNumber: form.recipientDetails.accountNumber,
                assetSymbol: assetSymbol,
                assetType: assetType,
                amount: numAmount,
            });

            if (!res.ok) {
                setForm((prev) => ({
                    ...prev,
                    isCheckingBalance: false,
                    amountError: res.error.message,
                    amountConfirmed: false,
                    verifyResult: null,
                }));
                return;
            }

            const result = res.data;

            if (!result.valid) {
                setForm((prev) => ({
                    ...prev,
                    isCheckingBalance: false,
                    amountError: tr('transfer.amountInput.error.insufficient', {
                        amount: result.sender.availableBalance,
                        currency: result.currency.symbol,
                    }),
                    amountConfirmed: false,
                    verifyResult: null,
                }));
            } else if (numAmount > result.sender.availableBalance) {
                setForm((prev) => ({
                    ...prev,
                    isCheckingBalance: false,
                    amountError: tr('transfer.amountInput.error.insufficient', {
                        amount: result.sender.availableBalance,
                        currency: result.currency.symbol,
                    }),
                    amountConfirmed: false,
                    verifyResult: null,
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    isCheckingBalance: false,
                    amountConfirmed: true,
                    amountError: null,
                    verifyResult: result,
                }));
            }
        } catch {
            setForm((prev) => ({
                ...prev,
                isCheckingBalance: false,
                amountError: t.transfer.error.verifyTransfer,
            }));
        }
    }, [form.amount, form.recipientDetails, actions, assetSymbol, assetType]);

    // Edit handlers with cascade reset
    const handleEditAccount = () => {
        setForm((prev) => ({
            ...prev,
            accountConfirmed: false,
            recipientDetails: null,
            accountError: null,
            currencyWarning: null,
            amount: '',
            amountConfirmed: false,
            amountError: null,
            selectedPurposeId: null,
            editingAfterConfirm: true,
            verifyResult: null,
        }));
    };

    const handleEditAmount = () => {
        setForm((prev) => ({
            ...prev,
            amountConfirmed: false,
            amountError: null,
            editingAfterConfirm: true,
            selectedPurposeId: null,
            verifyResult: null,
        }));
    };

    // Paste from clipboard
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                const trimmed = text.trim();
                setForm((prev) => ({
                    ...prev,
                    recipientAccountNumber: trimmed,
                    accountError: null,
                    inputMethod: 'MANUAL',
                }));
                // Trigger validation after paste
                setPendingPasteValidation(trimmed);
            }
        } catch {
            // Clipboard access denied — silently ignore
        }
    };

    // QR scan handler - opens scanner and handles result
    const handleScanQR = () => {
        console.log('Opening QR scanner for transfer...');
        openScannerWithCallback((accountNumber: string) => {
            console.log('Scanned QR result:', accountNumber);
            // Set the account number from QR and change input method to QR
            setForm((prev) => ({
                ...prev,
                recipientAccountNumber: accountNumber,
                accountError: null,
                currencyWarning: null,
                inputMethod: 'QR',
            }));
            // Trigger validation with the scanned account number
            setPendingQrValidation(accountNumber);
        });
    };

    // Send transfer
    const handleSend = async () => {
        if (!form.recipientDetails || !form.amountConfirmed || !form.selectedPurposeId) return;

        setForm((prev) => ({ ...prev, isSending: true }));

        try {
            // Generate idempotency key once and reuse on the post-step-up retry so
            // the backend dedups rather than creating a second transfer.
            const idempotencyKey = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            const attempt = () =>
                api.transfers.send({
                    toAccountNumber: form.recipientDetails!.accountNumber,
                    assetSymbol: assetSymbol,
                    assetType: assetType,
                    amount: parseFloat(form.amount),
                    purposeId: form.selectedPurposeId!,
                    note: form.note || undefined,
                    inputMethod: form.inputMethod,
                    idempotencyKey,
                });

            let res = await attempt();

            // A transport/HTTP failure is terminal — do not retry, because a
            // timeout may mean the transfer DID land and only the response was
            // lost. The idempotency key protects a deliberate retry; a silent one
            // here would just hide the ambiguity from the user.
            if (!res.ok) {
                setForm((prev) => ({ ...prev, isSending: false }));
                toast.error(res.error.message);
                return;
            }

            // Step-up arrives as a 200 whose body carries a challenge instead of
            // a transfer, so it is checked on `data`, not on the HTTP result.
            const stepUp = extractStepUp(res.data);
            if (stepUp) {
                const satisfied = await satisfyStepUp(stepUp);
                if (!satisfied) {
                    setForm((prev) => ({ ...prev, isSending: false }));
                    return;
                }
                // Same idempotencyKey on purpose: the backend dedups rather than
                // creating a second transfer.
                res = await attempt();
                if (!res.ok) {
                    setForm((prev) => ({ ...prev, isSending: false }));
                    toast.error(res.error.message);
                    return;
                }
            }

            if (extractStepUp(res.data)) {
                // Still gated after a satisfied challenge — surface as an error.
                setForm((prev) => ({ ...prev, isSending: false }));
                toast.error(t.transfer.error.generic);
            } else {
                const result = res.data as TransferResult;
                // Refresh transactions and balances in background
                refreshTransactions();
                refreshBalances(assetSymbol);

                setForm((prev) => ({
                    ...prev,
                    isSending: false,
                    isSuccess: true,
                    transferResult: result,
                }));
            }
        } catch {
            setForm((prev) => ({ ...prev, isSending: false }));
            toast.error(t.transfer.error.generic);
        }
    };

    const canSend = form.accountConfirmed && form.amountConfirmed && !!form.selectedPurposeId;

    const handleSendWithAnimation = () => {
        if (!canSend || form.isSending) return;
        handleSend();
    };

    // Get purpose label for receipt
    const purposeLabel = selectedPurposeName || form.selectedPurposeId || '';

    // Success screen
    if (form.isSuccess && form.transferResult) {
        return (
            <div className="w-full h-full flex items-center justify-center overflow-y-auto">
                <div className="max-w-xd-370 mx-xd-30 h-full">
                    <TransferSuccess
                        transferResult={form.transferResult}
                        senderAccountNumber={senderAccountNumber}
                        senderMaskedName={senderMaskedName}
                        recipientAccountNumber={form.recipientDetails?.accountNumber || ''}
                        recipientMaskedName={form.recipientDetails?.maskedName || ''}
                        amount={form.amount}
                        currency={assetSymbol}
                        purposeLabel={purposeLabel}
                        inputMethod={form.inputMethod}
                        onClose={onClose}
                    />
                </div>
            </div>
        );
    }

    // Main form
    return (
        <div className="w-full h-full items-center overflow-y-auto relative flex flex-col">
            <div className="max-w-xd-370 mx-xd-30 relative w-full text-white flex flex-col flex-1">
                {/* Header icon + title */}
                <div className="flex flex-col items-center mb-xd-16 pt-0">
                    <div className="mb-xd-4">
                        <Image
                            src={TitleIcon}
                            alt="Transfer"
                            width={40}
                            height={40}
                            className="size-xd-40"
                        />
                    </div>
                    <h2 className="text-xd-13 font-medium tracking-widest text-[#1D1D1D] uppercase">
                        {t.transfer.title}
                    </h2>
                </div>
                {/* Sender balance card */}
                <SenderCard selectedAssetSymbol={assetSymbol} />
                {/* Send To section */}
                <p className="text-xd-11 text-[#1D1D1D] font-medium text-center mt-xd-8 mb-xd-8">
                    {t.transfer.sendTo}
                </p>
                <div className="overflow-auto pb-xd-80">
                    {/* Recipient input */}
                    <RecipientInput
                        value={form.recipientAccountNumber}
                        onChange={(value) =>
                            setForm((prev) => ({
                                ...prev,
                                recipientAccountNumber: value,
                                accountError: null,
                                currencyWarning: null,
                                inputMethod: 'MANUAL',
                                editingAfterConfirm: false,
                            }))
                        }
                        onValidate={handleValidateAccount}
                        recipientDetails={form.recipientDetails}
                        isValidating={form.isValidatingAccount}
                        error={form.accountError}
                        currencyWarning={form.currencyWarning}
                        accountConfirmed={form.accountConfirmed}
                        onEdit={handleEditAccount}
                        inputMode={form.recipientInputMode}
                        onModeChange={(mode) =>
                            setForm((prev) => ({
                                ...prev,
                                recipientInputMode: mode,
                                recipientAccountNumber: '',
                                accountError: null,
                            }))
                        }
                        editingAfterConfirm={form.editingAfterConfirm}
                        onPaste={handlePaste}
                        onScanQR={handleScanQR}
                        inputMethod={form.inputMethod}
                        disabled={form.isValidatingAccount || form.isSending}
                    />

                    {/* Amount input */}
                    <div className="mt-xd-4">
                        <AmountInput
                            value={form.amount}
                            onChange={(value) =>
                                setForm((prev) => ({
                                    ...prev,
                                    amount: value,
                                    amountConfirmed: false,
                                    amountError: null,
                                }))
                            }
                            onValidate={handleValidateAmount}
                            amountConfirmed={form.amountConfirmed}
                            onEdit={handleEditAmount}
                            error={form.amountError}
                            isChecking={form.isCheckingBalance}
                            currency={assetSymbol}
                            focusTrigger={amountFocusTrigger}
                            disabled={
                                !form.accountConfirmed || form.isValidatingAccount || form.isSending
                            }
                        />
                    </div>

                    {/* Purpose selection */}
                    <div className="mt-xd-4">
                        <PurposeSelect
                            selectedId={form.selectedPurposeId}
                            onSelect={(id, name) => {
                                setForm((prev) => ({ ...prev, selectedPurposeId: id }));
                                setSelectedPurposeName(name);
                            }}
                            onChangeNote={(e) =>
                                setForm((prev) => ({ ...prev, note: e.target.value }))
                            }
                            note={form.note}
                        />
                    </div>
                </div>
                {/* Spacer */}
                <div className="flex-1" />

                {/* Send button */}
                <div className="flex w-full bg-white flex-col absolute bottom-0 items-center py-xd-24 mt-xd-16">
                    <button
                        onClick={handleSendWithAnimation}
                        disabled={!canSend || form.isSending}
                        className={`flex flex-col items-center gap-xd-4 transition-colors ${
                            canSend && !form.isSending
                                ? 'text-[#388CFF] cursor-pointer'
                                : 'text-[#CCCCCC]'
                        }`}
                    >
                        {canSend ? (
                            <Image
                                src={TransferIcon}
                                alt="Transfer"
                                width={25}
                                height={25}
                                className="size-xd-25"
                                style={{
                                    animation: form.isSending
                                        ? 'arrow-fly 1.5s ease-in-out infinite'
                                        : undefined,
                                }}
                            />
                        ) : (
                            <Image
                                src={TransferDisabledIcon}
                                alt="Transfer"
                                width={25}
                                height={25}
                                className="size-xd-25"
                            />
                        )}
                        <span className="text-xd-13 font-medium">
                            {form.isSending ? t.transfer.sendingButton : t.transfer.sendButton}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferSend;
