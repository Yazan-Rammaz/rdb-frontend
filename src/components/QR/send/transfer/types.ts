import type {
    RecipientAccountDetails,
    TransferResult,
    VerifyTransferResponse,
} from '@/core/types/transfer';

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
    recipientInputMode: 'account' | 'phone';
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
    accountConfirmed: false,
    editingAfterConfirm: false,
    inputMethod: 'MANUAL',
};
