/** Recipient account details returned by /transfers/lookup-account API */
export interface RecipientAccountDetails {
    found: boolean;
    accountNumber: string;
    name: string;
    maskedName?: string; // derived from name
}

/** Transfer purpose option from API */
export interface TransferPurpose {
    id: string;
    name: string;
}

/** Request payload for /transfers/verify API */
export interface VerifyTransferRequest {
    toAccountNumber: string;
    assetSymbol: string;
    assetType: string;
    amount: number;
}

/** Response from /transfers/verify API */
export interface VerifyTransferResponse {
    valid: boolean;
    sender: {
        accountNumber: string;
        name: string;
        availableBalance: number;
    };
    receiver: {
        accountNumber: string;
        name: string;
    };
    currency: {
        symbol: string;
        name: string;
    };
    amount: number;
}

/** Request payload for /transfers/send API */
export interface TransferRequest {
    toAccountNumber: string;
    assetSymbol: string;
    assetType: string;
    amount: number;
    purposeId: string;
    note?: string;
    inputMethod: 'MANUAL' | 'QR';
    idempotencyKey: string;
}

/** Success result from /transfers/send API */
export interface TransferResult {
    transferId: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    sender: {
        accountNumber: string;
        name: string;
        balanceAfter: number;
    };
    receiver: {
        accountNumber: string;
        name: string;
    };
    currency: {
        symbol: string;
        name: string;
    };
    amount: number;
    purpose: string;
    note?: string;
    createdAt: string;
}

/** Balance check result from checkTransferBalance API */
export interface BalanceCheckResult {
    sufficient: boolean;
    available: number;
}

/** Payement Request returned by getPaymentRequest API */
export interface PaymentRequestData {
    requestMoneyId: string;
    accountNumber: string;
    accountName: string;
    maskedName: string;
    currency: string;
    amount: number;
    reference: string;
    purposeId: string;
    purposeName: string;
    type: string;
    /** ISO timestamp when the request expires */
    expiresAt: string;
    /** Whether this request was already paid */
    isPaid: boolean;
    /** If paid, the transfer result */
    transferResult?: TransferResult;
    note?: string;
}
