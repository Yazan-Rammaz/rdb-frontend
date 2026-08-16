/**
 * Auth: User
 */
interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    profilePictureURL: string;
    userType: string;
    ratingStats: any;
    browserInfo: any;
    locationInfo: any;
    guestToken: any;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isBlocked: boolean;
    blockReason: string;
    blockedAt: string;
    isTwoFactorEnabled: boolean;
    language: string;
    createdAt: string;
    updatedAt: string;
    address: {
        id: string;
        userId: string;
        countryId: {
            id: string;
            name: string;
            nameAr: string;
            code: string;
        };
        regionId: {
            id: string;
            name: string;
            nameAr: string;
        };
        cityId: {
            id: string;
            name: string;
            nameAr: string;
        };
        address1: string;
        address2: string;
        zipCode: string;
        createdAt: string;
        updatedAt: string;
    };
    kycVerification: {
        status: string;
        expiresAt: string;
    };
}
interface UserData extends User {
    user: User;
    accessToken: {
        token: string;
        expiresAt: string;
    };
    refreshToken: {
        token: string;
        expiresAt: string;
    };
}
interface SendOtpResponse {
    message: string;
    msegatId?: number | string;
    sessionInfo?: string;
    provider?: string;
}
interface VerifyOtpResponse extends UserData {
}

/**
 * SHARED UTILITY TYPES
 */
interface FetchResponse<T = any> {
    data: T | null;
    error: string | null;
    status: number;
    isError?: boolean;
    url?: string;
    success: boolean;
}
interface Timestamps {
    createdAt: string;
    updatedAt: string;
    deletedAt: any;
}
interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
interface CursorPagination {
    startCursor: string;
    endCursor: string;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    total: number;
}

interface FeeStructure {
    enabled: boolean;
    type: string;
    percentage: number;
    fixedAmount: number;
}
interface PaytabConfig {
    paytabEnabled: boolean;
    paytabFees: FeeStructure;
    paytabTax: FeeStructure;
}
interface BaseAsset {
    id: string;
    name: string;
    symbol: string;
}
interface AssetItem {
    id: string;
    name: string;
    displayName: string;
    symbol: string;
    symbolImageUrl: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
interface BaseBank {
    id: string;
    name: string;
    code: string;
}
interface Transaction extends Timestamps {
    id: string;
    accountId: string;
    assetType: string;
    assetId: string;
    balanceId: string;
    assetSymbol: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    balanceField: string;
    title: string;
    journalEntryId: string;
}
interface BankDepositItem extends Timestamps {
    id: string;
    amount: number;
    taxAmount: number;
    feeAmount: number;
    netAmount: number;
    transferImageUrl: string;
    transactionReference: string;
    status: string;
    rejectionReason: string;
    processedBy: string;
    processedAt: string;
    walletCredited: boolean;
    bank: BaseBank;
    currency: BaseAsset;
}

/**
 * EXPORTED API RESPONSES
 */
interface BanksApi extends Pagination {
    items: Array<BaseBank & Timestamps & {
        description: string;
        swiftCode: string;
        depositAvailable: boolean;
        withdrawAvailable: boolean;
        isActive: boolean;
        currencies: Array<{
            currencyId: string;
            depositEnabled: boolean;
            withdrawEnabled: boolean;
            depositFee: FeeStructure;
            withdrawFee: FeeStructure;
            depositTax: FeeStructure;
            withdrawTax: FeeStructure;
            currency: BaseAsset & Timestamps & {
                symbolImageUrl: string;
                paytab: PaytabConfig;
                isActive: boolean;
            };
        }>;
    }>;
}
interface CurrenciesApi extends Pagination {
    items: Array<BaseAsset & Timestamps & {
        displayName: string;
        symbolImageUrl: string;
        paytab: PaytabConfig;
    }>;
}
interface SupportedAssetsApi {
    currencies: AssetItem[];
    metals: AssetItem[];
}
interface UploadMediaApi extends Timestamps {
    id: string;
    url: string;
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    type: string;
    uploaderId: string;
    uploaderType: string;
    metadata: {
        purpose: string;
    };
}
interface CreateBankDepositApi extends BankDepositItem {
}
interface GetBankDepositApi extends Pagination {
    items: BankDepositItem[];
}
interface CalculateFeesApi {
    amount: number;
    taxAmount: number;
    feeAmount: number;
    netAmount: number;
    totalDeductions: number;
    currencySymbol: string;
    bankNameEn: string;
    bankNameAr: string;
}
interface GetWalletBalancesApi {
    currencySymbol: string;
    totalAvailable: number;
    totalLocked: number;
    totalValue: number;
    wallets: Array<Timestamps & {
        id: string;
        accountNumber: string;
        type: string;
        userId: string;
        subtype: string;
        status: string;
        name: string;
        deletedAt: string | null;
        balances: Array<{
            id: string;
            accountId: string;
            assetType: string;
            assetId: string;
            assetSymbol: string;
            available: number;
            locked: number;
            reserved: number;
            createdAt: string;
            updatedAt: string;
            asset: BaseAsset & {
                displayName: string;
                symbolImageUrl: string;
                isActive: boolean;
            };
        }>;
    }>;
}
interface GetJournalEntriesApi extends CursorPagination {
    items: Array<Timestamps & {
        id: string;
        debitAccountId: string;
        creditAccountId: string;
        creditAssetSymbol: string;
        creditAssetType: string;
        creditAssetId: string;
        debitAssetSymbol: string;
        debitAssetType: string;
        debitAssetId: string;
        amount: number;
        description: string;
        transactionIds: string[];
        idempotencyKey: string;
        transactions: Transaction[];
    }>;
}
interface GetTransactionsApi extends CursorPagination {
    items: Transaction[];
}
interface CheckoutOrderApi {
    success: boolean;
    status: string;
    currencyId: string;
    items: Array<{
        cartId: string;
        amount: number;
        status: string;
        receiptId: string;
    }>;
}
interface FinancialLedgerAccount {
    id: string;
    accountNumber: string;
    name: string;
}
interface FinancialLedgerMetadata {
    purposeId?: string;
    purposeName?: string;
    inputMethod?: 'MANUAL' | 'QR';
    note?: string;
    paymentRequestId?: string;
    requestCode?: string;
}
interface FinancialLedgerItem {
    id: string;
    userId: string;
    ledgerType: 'ACCOUNT_TRANSFER' | 'PAYMENT_REQUEST' | 'DEPOSIT' | 'WITHDRAWAL' | string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED' | string;
    direction: 'IN' | 'OUT';
    title: string;
    description: string | null;
    assetType: string;
    assetId: string;
    assetSymbol: string;
    amount: number;
    feeAmount: number;
    taxAmount: number;
    senderUserId: string;
    senderAccountId: string;
    receiverUserId: string;
    receiverAccountId: string;
    referenceId: string;
    errorMessage: string | null;
    note: string | null;
    metadata: FinancialLedgerMetadata | null;
    senderAccount?: FinancialLedgerAccount;
    receiverAccount?: FinancialLedgerAccount;
    createdAt: string;
    updatedAt: string;
}
interface FinancialLedgerApi extends Pagination {
    items: FinancialLedgerItem[];
}

/** Recipient account details returned by /transfers/lookup-account API */
interface RecipientAccountDetails {
    found: boolean;
    accountNumber: string;
    name: string;
    maskedName?: string;
}
/** Transfer purpose option from API */
interface TransferPurpose {
    id: string;
    name: string;
}
/** Request payload for /transfers/verify API */
interface VerifyTransferRequest {
    toAccountNumber: string;
    assetSymbol: string;
    assetType: string;
    amount: number;
}
/** Response from /transfers/verify API */
interface VerifyTransferResponse {
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
interface TransferRequest {
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
interface TransferResult {
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
interface BalanceCheckResult {
    sufficient: boolean;
    available: number;
}
/** Deposit request returned by getDepositRequest API */
interface DepositRequestData {
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

type PaymentRequestStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
interface PaymentRequest {
    id: string;
    requesterId: string;
    requesterAccountId: string;
    requesterAccountNumber: string;
    payerId: string | null;
    payerAccountId: string | null;
    assetType: string;
    assetId: string;
    assetSymbol: string;
    amount: number;
    purposeId: string;
    note?: string;
    reference?: string;
    requestCode: string;
    expiresAt: string;
    isPermanent: boolean;
    status: PaymentRequestStatus;
    financialLedgerInId: string;
    accountTransferId: string | null;
    journalEntryId: string | null;
    fulfilledAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    createdAt: string;
    updatedAt: string;
}
interface PaymentRequestLookup {
    id: string;
    requesterAccountNumber: string;
    requesterAccountName: string;
    purpose: {
        id: string;
        name: string;
    };
    assetType: string;
    assetSymbol: string;
    amount: number;
    note?: string;
    reference?: string;
    requestCode: string;
    expiresAt: string;
    isPermanent: boolean;
    status: PaymentRequestStatus;
    createdAt: string;
}
interface CreatePaymentRequestInput {
    accountNumber: string;
    assetType: string;
    assetSymbol: string;
    amount: number;
    purposeId: string;
    note?: string;
    reference?: string;
    expiryMinutes?: number;
    isPermanent: boolean;
    idempotencyKey: string;
}
interface FulfillPaymentRequestInput {
    id: string;
    accountNumber: string;
    idempotencyKey: string;
    note?: string;
}
interface CancelPaymentRequestInput {
    id: string;
    reason: string;
}

export type { BanksApi as B, CalculateFeesApi as C, DepositRequestData as D, FinancialLedgerApi as F, GetBankDepositApi as G, PaymentRequest as P, RecipientAccountDetails as R, SupportedAssetsApi as S, TransferRequest as T, UploadMediaApi as U, VerifyTransferRequest as V, CreateBankDepositApi as a, CurrenciesApi as b, CheckoutOrderApi as c, GetWalletBalancesApi as d, GetJournalEntriesApi as e, GetTransactionsApi as f, TransferResult as g, BalanceCheckResult as h, TransferPurpose as i, VerifyTransferResponse as j, FetchResponse as k, SendOtpResponse as l, User as m, VerifyOtpResponse as n, CancelPaymentRequestInput as o, CreatePaymentRequestInput as p, FulfillPaymentRequestInput as q, PaymentRequestLookup as r };
