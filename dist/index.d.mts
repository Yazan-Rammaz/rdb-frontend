import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';

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

declare const core: {
    banking: {
        getSupportedAssets({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<SupportedAssetsApi | {
            error: string;
        }>;
        getCurrencies({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<CurrenciesApi | {
            error: string;
        }>;
        GetBanks({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<BanksApi | {
            error: string;
        } | undefined>;
        CreateBankDeposit({ bankId, currencyId, amount, transferImageUrl, transactionReference, idempotencyKey, token, authCookieName, }: {
            bankId: string;
            currencyId: string;
            amount: number;
            transferImageUrl: string;
            transactionReference: string;
            idempotencyKey: string;
            token?: string;
            authCookieName?: string;
        }): Promise<CreateBankDepositApi | {
            error: string;
        } | {
            error: string;
        }>;
        CalculateFees({ bankId, currencyId, amount, token, authCookieName, }: {
            bankId: string;
            currencyId: string;
            amount: number;
            token?: string;
            authCookieName?: string;
        }): Promise<CalculateFeesApi | {
            error: string;
        } | {
            error: string;
        }>;
        GetBankDeposits({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<GetBankDepositApi | {
            error: string;
        } | {
            error: string;
        }>;
        getAccountByBalanceId({ balanceId, token, authCookieName, }: {
            balanceId: string;
            token?: string;
            authCookieName?: string;
        }): Promise<{
            accountName: string;
            accountNumber: string;
            username: string;
            profilePicture: string;
            currency: string;
            initials: string;
        } | {
            error: string;
        }>;
        validateRecipientAccount({ accountNumber, token, authCookieName, }: {
            accountNumber: string;
            token?: string;
            authCookieName?: string;
        }): Promise<RecipientAccountDetails | {
            error: string;
        }>;
        lookupAccountByPhone({ phoneNumber, }: {
            phoneNumber: string;
        }): Promise<RecipientAccountDetails | {
            error: string;
        }>;
    };
    media: {
        UploadMedia({ file, token, authCookieName, }: {
            file: File;
            token?: string;
            authCookieName?: string;
        }): Promise<UploadMediaApi | {
            error: string;
        }>;
    };
    transactions: {
        GetWalletBalance({ currencySymbol, token, authCookieName, }: {
            currencySymbol: string;
            token?: string;
            authCookieName?: string;
        }): Promise<GetWalletBalancesApi | {
            error: string;
        }>;
        GetAccountBalance({ assetId, token, authCookieName, }: {
            assetId: string;
            token?: string;
            authCookieName?: string;
        }): Promise<GetWalletBalancesApi | {
            error: string;
        }>;
        GetJournalEntries({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<GetJournalEntriesApi | {
            error: string;
        }>;
        GetFinancialLedger({ token, authCookieName, page, limit, }?: {
            token?: string;
            authCookieName?: string;
            page?: number;
            limit?: number;
        }): Promise<FinancialLedgerApi | {
            error: string;
        }>;
        GetTransactions({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<GetTransactionsApi | {
            error: string;
        }>;
        CheckoutOrder({ storeKey, cartId, amount, idempotencyKey, currencyId, token, authCookieName, }: {
            cartId: string;
            amount: number;
            idempotencyKey: string;
            token?: string;
            authCookieName?: string;
            currencyId: string;
            storeKey?: "trydos";
        }): Promise<CheckoutOrderApi | {
            error: string;
        }>;
        checkTransferBalance({ amount, currency, }: {
            amount: number;
            currency: string;
        }): Promise<BalanceCheckResult>;
        getTransferPurposes({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<{
            error: string;
        } | TransferPurpose[]>;
        verifyTransfer({ toAccountNumber, assetSymbol, assetType, amount, senderAvailableBalance, token, authCookieName, }: VerifyTransferRequest & {
            senderAvailableBalance?: number;
            token?: string;
            authCookieName?: string;
        }): Promise<VerifyTransferResponse | {
            error: string;
        }>;
        SendTransfer({ toAccountNumber, assetSymbol, assetType, amount, purposeId, note, inputMethod, idempotencyKey, token, authCookieName, }: TransferRequest & {
            token?: string;
            authCookieName?: string;
        }): Promise<TransferResult | {
            error: string;
        }>;
        getDepositRequest({ requestMoneyId, }: {
            requestMoneyId: string;
            token?: string;
            authCookieName?: string;
        }): Promise<DepositRequestData | {
            error: string;
        }>;
    };
    wallets: {
        checkWallet({ id, token, authCookieName, }: {
            id: string;
            token?: string;
            authCookieName?: string;
        }): Promise<void>;
        createWallet({ id, token, authCookieName, }: {
            id: string;
            token?: string;
            authCookieName?: string;
        }): Promise<FetchResponse<unknown> & {
            status: number;
        }>;
    };
    auth: {
        verifyMe({ token, authCookieName, }?: {
            token?: string;
            authCookieName?: string;
        }): Promise<User | {
            error: string;
        }>;
        sendOtp({ phoneNumber, channel, email, type, }: {
            phoneNumber: string;
            channel: "sms" | "whatsapp";
            email?: string;
            type?: string;
        }): Promise<SendOtpResponse | {
            error: string;
        }>;
        reSendOtp({ phoneNumber, channel, type, }: {
            phoneNumber: string;
            channel: "sms" | "whatsapp";
            type?: string;
        }): Promise<SendOtpResponse | {
            error: string;
        }>;
        verifyOtp({ phoneNumber, otpCode, msegatId, sessionInfo, type, }: {
            phoneNumber: string;
            otpCode: string;
            msegatId?: number | string;
            sessionInfo?: string;
            type: "signIn" | "signUp";
        }): Promise<VerifyOtpResponse | {
            error: string;
        }>;
    };
    paymentRequests: {
        createPaymentRequest(input: CreatePaymentRequestInput & {
            token?: string;
            authCookieName?: string;
            baseUrl?: string;
            local?: string;
        }): Promise<PaymentRequest | {
            error: string;
        }>;
        lookupPaymentRequest(input: {
            code: string;
            token?: string;
            authCookieName?: string;
            baseUrl?: string;
            local?: string;
        }): Promise<PaymentRequestLookup | {
            error: string;
        }>;
        fulfillPaymentRequest(input: FulfillPaymentRequestInput & {
            token?: string;
            authCookieName?: string;
            baseUrl?: string;
            local?: string;
        }): Promise<PaymentRequest | {
            error: string;
        }>;
        cancelPaymentRequest(input: CancelPaymentRequestInput & {
            token?: string;
            authCookieName?: string;
            baseUrl?: string;
            local?: string;
        }): Promise<PaymentRequest | {
            error: string;
        }>;
    };
};

type RDBActions = typeof core;

/**
 * Cookie keys configuration for reading values from host app cookies
 */
interface CookiesKeys {
    authToken?: string;
    local?: string;
    baseUrl?: string;
}
/**
 * Props for the RDB Component.
 * These props allow the host application to configure the library
 * and provide the necessary Server Actions.
 */
interface RDBProps {
    actions?: RDBActions;
    /**
     * The name of the cookie that holds the auth token.
     * In standalone mode, defaults to the internal 'rdb_at'.
     * In package/library mode, pass the host app's cookie name (e.g. 'my_app_token').
     */
    authCookieName?: string;
    onClose?: () => void;
    cookiesKeys?: CookiesKeys;
    onReceivedAuthToken?: (token?: string) => void;
    handleUnauthenticated: () => void;
    storeKey?: string;
}
declare const initialData: any;

/**
 * RDB Main Entry Point Component
 * This component acts as a bridge between the host application and the internal library logic.
 * It encapsulates all necessary providers and routing for the library to function independently.
 */
declare function RDB(props: RDBProps): react_jsx_runtime.JSX.Element | null;

declare const en: {
    common: {
        appName: string;
        appDescription: string;
        logoAlt: string;
        scanCodeAlt: string;
        arrowAlt: string;
        lockAlt: string;
        flagAlt: string;
        cancel: string;
        history: string;
        retry: string;
        accessibility: {
            send: string;
            receive: string;
            goBack: string;
            back: string;
            switchCamera: string;
            scanQrCode: string;
            clearInput: string;
            refreshBalance: string;
            sendPhoneNumber: string;
            showBalance: string;
            hideBalance: string;
        };
    };
    splash: {
        words: string[];
    };
    header: {
        receive: string;
        send: string;
    };
    notFound: {
        code: string;
        title: string;
        description: string;
        goHome: string;
        trySignup: string;
    };
    auth: {
        getStarted: {
            title: string;
            description: string;
            haveAccount: string;
            newCustomer: string;
            later: string;
        };
        terms: {
            toCreate: string;
            agreeAndContinueQuoted: string;
            toAccept: string;
            termsOfServices: string;
            termsLabel: string;
            agreeButton: string;
            later: string;
        };
        authLayout: {
            defaultTitle: string;
        };
        enterPhone: {
            signUpTitle: string;
            signInTitle: string;
            enterPhoneInstruction: string;
            verificationInfo: string;
            privacyLine1: string;
            privacyLine2: string;
            phonePlaceholder: string;
        };
        enterPin: {
            title: string;
            enterCodePrefix: string;
            whatsapp: string;
            sms: string;
            resendIn: string;
            resendCode: string;
        };
        selectMethod: {
            info: string;
            whatsapp: string;
            sms: string;
        };
        loginForm: {
            usernamePlaceholder: string;
            userFallback: string;
        };
        loginOptions: {
            clearLogin: string;
            changeUser: string;
            forgetPassword: string;
        };
        otp: {
            sentSuccess: string;
            sendError: string;
            unexpectedError: string;
            invalidExpired: string;
            verificationFailed: string;
            verifiedSigningIn: string;
            saveAuthFailed: string;
        };
    };
    transfer: {
        title: string;
        amountInput: {
            title: string;
            placeholder: string;
            edit: string;
            error: {
                validation: string;
                insufficient: string;
            };
        };
        sendTo: string;
        notePlaceholder: string;
        sendButton: string;
        sendingButton: string;
        error: {
            generic: string;
            validateAccount: string;
            verifyTransfer: string;
            invalidAmount: string;
            incorrectFormat: string;
        };
        recipient: {
            edit: string;
            enter: string;
            recipientAccount: string;
            recipientAccountNumber: string;
            or: string;
            phoneNumber: string;
            paste: string;
            placeholderPhone: string;
            placeholderAccount: string;
        };
        sender: {
            label: string;
            refreshBalance: string;
        };
        deposit: {
            title: string;
            sendButton: string;
            sendingButton: string;
            expiredButton: string;
            cancelled: string;
            amountToBeSent: string;
            referenceId: string;
            purposeOfRequest: string;
            type: string;
            depositRequest: string;
            validUntil: string;
            expiryWarning: string;
            minutesUntil: string;
            noWallet: string;
            currencyMismatch: string;
            alreadyPaid: string;
            enterAmount: string;
            selectCurrency: string;
        };
        receipt: {
            moneySentSuccess: string;
            senderAccountNumber: string;
            recipientAccountNumber: string;
            amountSent: string;
            reference: string;
            dateTime: string;
            type: string;
            typeValue: string;
            purpose: string;
            status: string;
            verificationCode: string;
            receiptTitle: string;
            download: string;
            share: string;
            done: string;
            downloaded: string;
            downloadFailed: string;
            shared: string;
            sharedCopied: string;
            shareFailed: string;
            shareTitle: string;
            shareText: string;
            statusValue: {
                completed: string;
                pending: string;
                failed: string;
            };
        };
    };
    home: {
        totalBalance: string;
        totalBalanceWithCurrency: string;
        addCurrency: string;
        addCurrencyWithAccount: string;
        balanceActions: {
            statistic: string;
            chart: string;
            info: string;
        };
        allTransactions: string;
        allTransactionsWithCurrency: string;
        transactionStatus: {
            success: string;
            pending: string;
            failed: string;
        };
        transactions: {
            transferSend: string;
            transferReceive: string;
            defaultTitle: string;
        };
        deposit: {
            accountName: string;
            accountNumber: string;
            currency: string;
        };
        sendChoose: {
            title: string;
            transfer: string;
            transferSub: string;
            cashWithdrawal: string;
            cashWithdrawalSub: string;
            billPayments: string;
            billPaymentsSub: string;
            history: string;
            nearbyCenters: string;
        };
        qr: {
            addRequest: string;
            generateRequest: string;
            generatingRequest: string;
            enterAmount: string;
            enterReference: string;
            selectPurpose: string;
            type: string;
            depositRequest: string;
            validUntil: string;
            optional: string;
            validation: {
                amountRequired: string;
                purposeRequired: string;
                validityRequired: string;
                incorrectAccountNumber: string;
                differentCurrency: string;
                insufficientBalance: string;
            };
            validityDescription: string;
            note: string;
            validity: {
                always: string;
                m3: string;
                m1: string;
                m15: string;
                h1: string;
                h24: string;
            };
            copy: string;
            download: string;
            share: string;
            send: string;
            cancel: string;
            amountToSend: string;
            messages: {
                noWalletIdAvailable: string;
                qrGenerated: string;
                qrDownloadError: string;
                qrDownloadSuccess: string;
                qrDownloadFailed: string;
                qrPreviewError: string;
                qrPreviewSuccess: string;
                qrPreviewFailed: string;
                qrCopied: string;
                qrCopyFailed: string;
                qrShareSuccess: string;
                qrShareFailed: string;
                invalidQrCode: string;
                missingWalletIdAndCurrency: string;
                missingWalletId: string;
                missingCurrency: string;
                accountDataNotAvailable: string;
                fetchingAccountDetails: string;
                processingTransfer: string;
                transferInitiatedSuccessfully: string;
                failedToFetchAccountDetails: string;
                failedToFetchAccountData: string;
                invalidAmount: string;
                missingAccountInfo: string;
                missingAccountNumber: string;
                missingAccountName: string;
            };
            scanner: {
                UnableToAccessCamera: string;
                title: string;
                positionQRCode: string;
                initializingCamera: string;
                settingUpCamera: string;
                readyToScan: string;
                tipsLabel: string;
                tipsContent: string;
                readCode: string;
                orChoose: string;
                sendTitle: string;
                sendDescription: string;
                receiveTitle: string;
                receiveDescription: string;
                requestPermission: string;
                CameraNotFound: string;
            };
        };
    };
    footer: {
        home: string;
        transactions: string;
        addresses: string;
        settings: string;
    };
    pages: {
        settings: string;
        transactions: string;
        addresses: string;
    };
    languageSelector: {
        label: string;
        english: string;
        arabic: string;
        turkish: string;
    };
    profile: {
        noUserData: string;
        profileAlt: string;
        fallbackInitial: string;
        personalInfo: string;
        email: string;
        verified: string;
        phoneNumber: string;
        firstNameIcon: string;
        firstName: string;
        lastNameIcon: string;
        lastName: string;
        addressSection: string;
        country: string;
        region: string;
        city: string;
        address: string;
        zipCode: string;
        accountInfo: string;
        accountStatus: string;
        blocked: string;
        active: string;
        twoFactor: string;
        enabled: string;
        disabled: string;
        memberSince: string;
        logout: string;
        logoutConfirmation: string;
        notProvided: string;
    };
    send: {
        header_title: string;
        purpose_select_label: string;
        note_placeholder: string;
        transfer: {
            icon_alt: string;
            label: string;
            description: string;
        };
        withdraw: {
            icon_alt: string;
            label: string;
            description: string;
            nearby_centers: string;
        };
        bills: {
            icon_alt: string;
            label: string;
            description: string;
        };
    };
    countries: {
        SY: string;
        TR: string;
        IQ: string;
        JO: string;
        LB: string;
        SA: string;
        AE: string;
        EG: string;
        US: string;
        GB: string;
        DE: string;
        FR: string;
        IT: string;
        ES: string;
        NL: string;
        SE: string;
        KW: string;
        QA: string;
        BH: string;
        OM: string;
        PS: string;
        YE: string;
        LY: string;
        SD: string;
        TN: string;
        DZ: string;
        MA: string;
        IN: string;
        PK: string;
        BD: string;
        CN: string;
        JP: string;
        KR: string;
        RU: string;
        BR: string;
        MX: string;
        CA: string;
        AU: string;
    };
};

type DeepStringify<T> = {
    [K in keyof T]: T[K] extends readonly (infer _U)[] ? string[] : T[K] extends Record<string, unknown> ? DeepStringify<T[K]> : string;
};
type TranslationSchema = DeepStringify<typeof en>;

type SupportedLanguage = "en" | "ar" | "tr";

interface I18nContextValue {
    /** Current language code */
    language: SupportedLanguage;
    /** Translation function */
    tr: (key: string, params?: Record<string, any>) => string;
    t: TranslationSchema;
    /** Whether the current language is RTL */
    rtl: boolean;
    /** Direction attribute value: 'rtl' | 'ltr' */
    dir: 'rtl' | 'ltr';
    /** Change the language (only works in standalone mode) */
    setLanguage: (lang: SupportedLanguage) => void;
}
interface I18nProviderProps {
    children: React.ReactNode;
    /**
     * When used as RDB dependency, pass the `locale` prop (e.g., "sy-en", "lb-ar").
     * The language is extracted from this value and is read-only.
     *
     * When not provided (standalone mode), the language is loaded from
     * localStorage and can be changed by the user.
     */
    locale?: string;
}
declare function I18nProvider({ children, locale }: I18nProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Access translations, language, and direction info.
 *
 * @example
 * const { t, tr, rtl, language, setLanguage } = useTranslation();
 * <p>{t.auth.enterPhone.signInTitle}</p>
 */
declare function useTranslation(): I18nContextValue;

export { I18nProvider, RDB, type RDBProps, type SupportedLanguage, initialData, useTranslation };
