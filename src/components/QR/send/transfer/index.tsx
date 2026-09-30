'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { api, isNetworkError } from '@/api';
import type { ApiError, RecipientAccountDetails, TransferResult } from '@/api';
import { isOffline } from '@/lib/networkStatus';
import {
    E164_MAX_DIGITS,
    findCountry,
    normalizePhoneDigits,
    phoneIssue,
    toE164,
} from '@/lib/phoneValidation';
import { useIsOnline, useOnReconnect } from '@/hooks/useIsOnline';
import { resolveRecipient } from '@/api/helpers/resolveRecipient';
import { lookupAccountByPhoneMock } from '@/api/helpers/lookupAccountByPhone.mock';
import { useStore } from '@/context/StoreContext';
import { useScanner } from '@/context/ScannerContext';
import { useStepUp, extractStepUp } from '@/hooks/useStepUp';
import { useInlineFeedback } from '@/hooks/useInlineFeedback';
import InlineFeedback from '@/components/ui/InlineFeedback';
import SenderCard from './SenderCard';
import RecipientModeTabs from './RecipientModeTabs';
import RecipientInput from './RecipientInput';
import UnregisteredRecipientFields from './UnregisteredRecipientFields';
import AmountInput from './AmountInput';
import PurposeSelect from './PurposeSelect';
import TransferSuccess from './TransferSuccess';
import { emptyUnregisteredRecipient, initialFormState } from './types';
import type { RecipientInputMode, TransferFormState } from './types';
import TitleIcon from '@/assets/icons/home/qr/sendT.svg';
import TransferIcon from '@/assets/icons/home/transfer/transfer.svg';
import TransferDisabledIcon from '@/assets/icons/home/transfer/transferdisabled.svg';
import { useTranslation } from '@/context/I18nContext';

const ACCOUNT_NUMBER_RE = /^\d{4}-\d{4}$/;

/** A phone prefix is only judged once it is as long as the longest dial code. */
const MIN_PHONE_DIGITS_TO_JUDGE = 3;

/** Whether the value is ready to be looked up without the sender asking. */
const isCompleteRecipientValue = (mode: RecipientInputMode, value: string): boolean =>
    mode === 'phone' ? phoneIssue(value) === null : ACCOUNT_NUMBER_RE.test(value);

/**
 * How long to wait after the last keystroke before looking the recipient up.
 * A phone number can be valid and still unfinished — a Syrian number is 8 or 9
 * digits — so one that could still grow waits longer.
 */
const recipientLookupDelay = (mode: RecipientInputMode, value: string): number => {
    if (mode !== 'phone') return 500;
    const country = findCountry(value);
    const isFullLength =
        !!country && value.length === country.dialCode.length + country.maxLocal;
    return isFullLength ? 500 : 1000;
};

/** Everything that hangs off a resolved recipient; cleared whenever it is. */
const clearedRecipient = {
    accountConfirmed: false,
    recipientDetails: null,
    recipientNotFound: false,
    unregisteredRecipient: emptyUnregisteredRecipient,
    accountError: null,
    currencyWarning: null,
    amount: '',
    amountConfirmed: false,
    amountError: null,
    selectedPurposeId: null,
    verifyResult: null,
} satisfies Partial<TransferFormState>;

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
    const { activeAssetSymbol, activeAssetType, balances, refreshTransactions, refreshBalances } =
        useStore();
    // Send errors, above the Send button. Sticky: on a money screen a vanished
    // error invites a blind second tap. Cleared by the next Send or any change
    // to what is being sent.
    const {
        feedback: sendFeedback,
        error: showSendError,
        clear: clearSendFeedback,
    } = useInlineFeedback();
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
    const isOnline = useIsOnline();
    // Idempotency key for the transfer currently on screen — see handleSend.
    const idempotencyKeyRef = useRef<string | null>(null);
    const refreshAfterReconnectRef = useRef(false);

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
        if (!ACCOUNT_NUMBER_RE.test(value)) {
            return t.transfer.error.incorrectFormat;
        }
        return null;
    };

    // Why a phone number cannot be looked up, in the sender's language.
    const validatePhoneFormat = (value: string): string | null => {
        switch (phoneIssue(value)) {
            case 'missing-country-code':
                return t.auth.enterPhone.errors.missingCountryCode;
            case 'unsupported-country':
                return t.auth.enterPhone.errors.unsupportedCountry;
            case 'wrong-length':
                return t.transfer.recipient.errors.invalidPhone;
            default:
                return null;
        }
    };

    const startRecipientLookup = () =>
        setForm((prev) => ({
            ...prev,
            isValidatingAccount: true,
            accountError: null,
            currencyWarning: null,
        }));

    const confirmRecipient = (recipient: RecipientAccountDetails) =>
        setForm((prev) => ({
            ...prev,
            isValidatingAccount: false,
            recipientDetails: recipient,
            accountConfirmed: true,
            accountError: null,
            currencyWarning: null,
        }));

    const rejectRecipient = (message: string) =>
        setForm((prev) => ({
            ...prev,
            isValidatingAccount: false,
            accountError: message,
            recipientDetails: null,
            accountConfirmed: false,
        }));

    // Validate account by number (typed, pasted or scanned)
    const validateAccountByNumber = useCallback(
        async (accountNumber: string) => {
            const value = accountNumber.trim();
            if (!value) return;

            const formatError = validateAccountFormat(value);
            if (formatError) {
                setForm((prev) => ({ ...prev, accountError: formatError }));
                return;
            }
            // Offline: the lookup runs on reconnect instead (see useOnReconnect).
            if (isOffline()) return;

            startRecipientLookup();

            try {
                const result = await resolveRecipient(value);

                // resolveRecipient keeps only the message; the api client has
                // already settled the connectivity state, so ask it instead.
                if (!result.ok && isOffline()) {
                    setForm((prev) => ({ ...prev, isValidatingAccount: false }));
                    return;
                }

                if (!result.ok) rejectRecipient(result.message);
                else confirmRecipient(result.recipient);
            } catch {
                rejectRecipient(t.transfer.error.validateAccount);
            }
        },
        [t],
    );

    // Look a phone number up. Found: the recipient is confirmed exactly as an
    // account number would be. Not found: the sender names the recipient.
    const validatePhoneNumber = useCallback(
        async (phoneNumber: string) => {
            const value = normalizePhoneDigits(phoneNumber);
            if (!value) return;

            const formatError = validatePhoneFormat(value);
            if (formatError) {
                setForm((prev) => ({ ...prev, accountError: formatError }));
                return;
            }
            if (isOffline()) return;

            startRecipientLookup();

            try {
                // A mock, not an API call — there is no phone-lookup endpoint
                // yet. See the file for what to do when one exists.
                const result = await lookupAccountByPhoneMock(toE164(value));

                if (result.status === 'error' && isOffline()) {
                    setForm((prev) => ({ ...prev, isValidatingAccount: false }));
                    return;
                }

                if (result.status === 'found') confirmRecipient(result.recipient);
                else if (result.status === 'error') rejectRecipient(result.message);
                else {
                    setForm((prev) => ({
                        ...prev,
                        isValidatingAccount: false,
                        recipientNotFound: true,
                    }));
                }
            } catch {
                rejectRecipient(t.transfer.error.validateAccount);
            }
        },
        [t],
    );

    const lookupRecipient = useCallback(
        (mode: RecipientInputMode, value: string) =>
            mode === 'phone' ? validatePhoneNumber(value) : validateAccountByNumber(value),
        [validateAccountByNumber, validatePhoneNumber],
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
            lookupRecipient(form.recipientInputMode, pendingPasteValidation);
            setPendingPasteValidation(null);
        }
    }, [pendingPasteValidation, form.recipientInputMode, lookupRecipient]);

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

    // Auto-validate shortly after the user types a complete account number
    // (xxxx-xxxx) or a valid phone number
    useEffect(() => {
        const value = form.recipientAccountNumber;
        const mode = form.recipientInputMode;

        if (recipientValidateDebounceRef.current) {
            clearTimeout(recipientValidateDebounceRef.current);
            recipientValidateDebounceRef.current = null;
        }

        if (
            form.accountConfirmed ||
            form.isValidatingAccount ||
            form.editingAfterConfirm ||
            form.accountError ||
            form.recipientNotFound
        )
            return;
        if (isCompleteRecipientValue(mode, value)) {
            recipientValidateDebounceRef.current = setTimeout(() => {
                lookupRecipient(mode, value);
            }, recipientLookupDelay(mode, value));
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
        form.recipientNotFound,
        form.recipientInputMode,
        lookupRecipient,
    ]);

    // Validate the recipient on demand (Enter)
    const handleValidateAccount = useCallback(() => {
        lookupRecipient(form.recipientInputMode, form.recipientAccountNumber);
    }, [form.recipientAccountNumber, form.recipientInputMode, lookupRecipient]);

    // Validate amount via verify API
    const handleValidateAmount = useCallback(async () => {
        const value = form.amount.trim();
        if (!value || !form.recipientDetails) return;

        const numAmount = parseFloat(value);
        if (isNaN(numAmount) || numAmount <= 0) {
            setForm((prev) => ({ ...prev, amountError: t.transfer.error.invalidAmount }));
            return;
        }
        if (isOffline()) return;

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

            if (!res.ok && isNetworkError(res.error)) {
                setForm((prev) => ({ ...prev, isCheckingBalance: false }));
                return;
            }

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
    }, [form.amount, form.recipientDetails, assetSymbol, assetType]);

    // Edit handlers with cascade reset
    const handleEditAccount = () => {
        setForm((prev) => ({ ...prev, ...clearedRecipient, editingAfterConfirm: true }));
    };

    // Switching tabs starts the recipient over: an account number is not a
    // phone number, and neither is whoever the last one resolved to.
    const handleRecipientModeChange = (mode: RecipientInputMode) => {
        if (mode === form.recipientInputMode) return;
        setForm((prev) => ({
            ...prev,
            ...clearedRecipient,
            recipientInputMode: mode,
            recipientAccountNumber: '',
            inputMethod: 'MANUAL',
            editingAfterConfirm: false,
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
                const isPhone = form.recipientInputMode === 'phone';
                const pasted = isPhone ? normalizePhoneDigits(text) : text.trim();
                // Too long to be a phone number at all: say so rather than
                // cut it down to a number that belongs to someone else.
                if (isPhone && pasted.length > E164_MAX_DIGITS) {
                    setForm((prev) => ({
                        ...prev,
                        accountError: t.transfer.recipient.errors.invalidPhone,
                    }));
                    return;
                }
                setForm((prev) => ({
                    ...prev,
                    recipientAccountNumber: pasted,
                    accountError: null,
                    inputMethod: 'MANUAL',
                }));
                // Trigger validation after paste
                setPendingPasteValidation(pasted);
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

    // A network failure leaves the outcome unknown: the transfer may have landed
    // with only the response lost. Stay silent (the offline pill says it), keep
    // the key so a retry is deduplicated, and refresh the ledger and balance
    // once back online so a transfer that did land shows up.
    const handleSendFailure = (error: ApiError) => {
        if (isNetworkError(error)) {
            refreshAfterReconnectRef.current = true;
            return;
        }
        idempotencyKeyRef.current = null;
        showSendError(error.message, { sticky: true });
    };

    // Send transfer
    const handleSend = async () => {
        if (!form.recipientDetails || !form.amountConfirmed || !form.selectedPurposeId) return;
        if (isOffline()) return;

        clearSendFeedback();
        setForm((prev) => ({ ...prev, isSending: true }));

        try {
            // One key per transfer, not per tap: reused on the post-step-up
            // retry and on a retry after a dropped connection, so the backend
            // dedups rather than creating a second transfer.
            idempotencyKeyRef.current ??= `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            const idempotencyKey = idempotencyKeyRef.current;

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
                handleSendFailure(res.error);
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
                    handleSendFailure(res.error);
                    return;
                }
            }

            // The server has answered: whatever it decided, a later tap is a new
            // transfer and gets a new key.
            idempotencyKeyRef.current = null;

            if (extractStepUp(res.data)) {
                // Still gated after a satisfied challenge — surface as an error.
                setForm((prev) => ({ ...prev, isSending: false }));
                showSendError(t.transfer.error.generic, { sticky: true });
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
            showSendError(t.transfer.error.generic, { sticky: true });
        }
    };

    // Changing what is being sent makes it a different transfer — new key.
    useEffect(() => {
        idempotencyKeyRef.current = null;
    }, [
        form.recipientDetails?.accountNumber,
        form.amount,
        form.selectedPurposeId,
        form.note,
    ]);

    // ...and an error about the previous one no longer applies.
    useEffect(() => {
        clearSendFeedback();
    }, [
        clearSendFeedback,
        form.recipientDetails?.accountNumber,
        form.amount,
        form.selectedPurposeId,
        form.note,
    ]);

    useOnReconnect(() => {
        if (refreshAfterReconnectRef.current) {
            refreshAfterReconnectRef.current = false;
            refreshTransactions();
            refreshBalances(assetSymbol);
        }
        // A lookup or amount check skipped while offline runs now.
        if (
            !form.accountConfirmed &&
            !form.isValidatingAccount &&
            !form.accountError &&
            !form.recipientNotFound &&
            isCompleteRecipientValue(form.recipientInputMode, form.recipientAccountNumber)
        ) {
            void lookupRecipient(form.recipientInputMode, form.recipientAccountNumber);
        } else if (
            form.recipientDetails &&
            form.amount &&
            !form.amountConfirmed &&
            !form.isCheckingBalance &&
            !form.amountError
        ) {
            void handleValidateAmount();
        }
    });

    const canSend =
        form.accountConfirmed && form.amountConfirmed && !!form.selectedPurposeId && isOnline;

    const handleSendWithAnimation = () => {
        if (!canSend || form.isSending) return;
        handleSend();
    };

    // A phone prefix that matches no country is wrong as soon as it is typed —
    // no need to wait for Enter. A number that is merely unfinished is not.
    const phoneTypingError =
        form.recipientInputMode === 'phone' &&
        form.recipientAccountNumber.length >= MIN_PHONE_DIGITS_TO_JUDGE &&
        phoneIssue(form.recipientAccountNumber) !== 'wrong-length'
            ? validatePhoneFormat(form.recipientAccountNumber)
            : null;

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
                {/* Send To section — how the recipient is identified */}
                <div className="mt-xd-8 mb-xd-8">
                    <RecipientModeTabs
                        mode={form.recipientInputMode}
                        onModeChange={handleRecipientModeChange}
                        disabled={form.isValidatingAccount || form.isSending}
                    />
                </div>
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
                                recipientNotFound: false,
                                unregisteredRecipient: emptyUnregisteredRecipient,
                                inputMethod: 'MANUAL',
                                editingAfterConfirm: false,
                            }))
                        }
                        onValidate={handleValidateAccount}
                        recipientDetails={form.recipientDetails}
                        isValidating={form.isValidatingAccount}
                        error={form.accountError ?? phoneTypingError}
                        currencyWarning={form.currencyWarning}
                        notice={
                            form.recipientNotFound ? t.transfer.recipient.notRegistered : null
                        }
                        accountConfirmed={form.accountConfirmed}
                        onEdit={handleEditAccount}
                        inputMode={form.recipientInputMode}
                        onPaste={handlePaste}
                        onScanQR={handleScanQR}
                        inputMethod={form.inputMethod}
                        disabled={form.isValidatingAccount || form.isSending}
                    />

                    {/* No account on this phone number: who the money is for */}
                    {form.recipientNotFound && (
                        <div className="mt-xd-4">
                            <UnregisteredRecipientFields
                                value={form.unregisteredRecipient}
                                onChange={(unregisteredRecipient) =>
                                    setForm((prev) => ({ ...prev, unregisteredRecipient }))
                                }
                                disabled={form.isSending}
                            />
                        </div>
                    )}

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
                    {/* The bar's empty py-xd-24 top padding: out of flow, nothing moves. */}
                    <InlineFeedback
                        feedback={sendFeedback}
                        lines={1}
                        className="absolute inset-x-0 top-0 h-xd-24 items-center px-xd-25"
                    />
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
