import type {
    RecipientAccountDetails,
    TransferResult,
    VerifyTransferResponse,
} from '@/core/types/transfer';

/** How the sender identifies the recipient. Drives the tabs above the field. */
export type RecipientInputMode = 'account' | 'phone';

/**
 * Details collected for a phone number that has no account yet. They exist so
 * the money can be released against a matching official document.
 */
export interface UnregisteredRecipient {
    fullName: string;
    idNumber: string;
}

export const emptyUnregisteredRecipient: UnregisteredRecipient = { fullName: '', idNumber: '' };

export interface TransferFormState {
    recipientAccountNumber: string;
    recipientDetails: RecipientAccountDetails | null;
    amount: string;
    amountConfirmed: boolean;
    selectedPurposeId: string | null;
    note: string;
    isValidatingAccount: boolean;
    isCheckingBalance: boolean;
    isSending: boolean;
    isSuccess: boolean;
    transferResult: TransferResult | null;
    verifyResult: VerifyTransferResponse | null;
    accountError: string | null;
    amountError: string | null;
    currencyWarning: string | null;
    recipientInputMode: RecipientInputMode;
    /** Phone lookup answered "no account on this number". */
    recipientNotFound: boolean;
    unregisteredRecipient: UnregisteredRecipient;
    accountConfirmed: boolean;
    editingAfterConfirm: boolean;
    inputMethod: 'MANUAL' | 'QR';
}

export const initialFormState: TransferFormState = {
    recipientAccountNumber: '',
    recipientDetails: null,
    amount: '',
    amountConfirmed: false,
    selectedPurposeId: null,
    note: '',
    isValidatingAccount: false,
    isCheckingBalance: false,
    isSending: false,
    isSuccess: false,
    transferResult: null,
    verifyResult: null,
    accountError: null,
    amountError: null,
    currencyWarning: null,
    recipientInputMode: 'account',
    recipientNotFound: false,
    unregisteredRecipient: emptyUnregisteredRecipient,
    accountConfirmed: false,
    editingAfterConfirm: false,
    inputMethod: 'MANUAL',
};
