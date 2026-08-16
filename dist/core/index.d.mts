import { C as CalculateFeesApi, a as CreateBankDepositApi, G as GetBankDepositApi, B as BanksApi, b as CurrenciesApi, S as SupportedAssetsApi, R as RecipientAccountDetails, U as UploadMediaApi, c as CheckoutOrderApi, d as GetWalletBalancesApi, F as FinancialLedgerApi, e as GetJournalEntriesApi, f as GetTransactionsApi, T as TransferRequest, g as TransferResult, h as BalanceCheckResult, D as DepositRequestData, i as TransferPurpose, V as VerifyTransferRequest, j as VerifyTransferResponse, k as FetchResponse, l as SendOtpResponse, m as User, n as VerifyOtpResponse, o as CancelPaymentRequestInput, P as PaymentRequest, p as CreatePaymentRequestInput, q as FulfillPaymentRequestInput, r as PaymentRequestLookup } from '../payment-requests-DmS1jRd2.mjs';

declare function getSupportedAssets({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<SupportedAssetsApi | {
    error: string;
}>;
/** @deprecated Use getSupportedAssets() instead */
declare function getCurrencies({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<CurrenciesApi | {
    error: string;
}>;
declare function GetBanks({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<BanksApi | {
    error: string;
} | undefined>;
declare function CreateBankDeposit({ bankId, currencyId, amount, transferImageUrl, transactionReference, idempotencyKey, token, authCookieName, }: {
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
declare function CalculateFees({ bankId, currencyId, amount, token, authCookieName, }: {
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
declare function GetBankDeposits({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<GetBankDepositApi | {
    error: string;
} | {
    error: string;
}>;
declare function getAccountByBalanceId({ balanceId, token, authCookieName, }: {
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
declare function validateRecipientAccount({ accountNumber, token, authCookieName, }: {
    accountNumber: string;
    token?: string;
    authCookieName?: string;
}): Promise<RecipientAccountDetails | {
    error: string;
}>;
declare function lookupAccountByPhone({ phoneNumber, }: {
    phoneNumber: string;
}): Promise<RecipientAccountDetails | {
    error: string;
}>;

declare const banking_CalculateFees: typeof CalculateFees;
declare const banking_CreateBankDeposit: typeof CreateBankDeposit;
declare const banking_GetBankDeposits: typeof GetBankDeposits;
declare const banking_GetBanks: typeof GetBanks;
declare const banking_getAccountByBalanceId: typeof getAccountByBalanceId;
declare const banking_getCurrencies: typeof getCurrencies;
declare const banking_getSupportedAssets: typeof getSupportedAssets;
declare const banking_lookupAccountByPhone: typeof lookupAccountByPhone;
declare const banking_validateRecipientAccount: typeof validateRecipientAccount;
declare namespace banking {
  export { banking_CalculateFees as CalculateFees, banking_CreateBankDeposit as CreateBankDeposit, banking_GetBankDeposits as GetBankDeposits, banking_GetBanks as GetBanks, banking_getAccountByBalanceId as getAccountByBalanceId, banking_getCurrencies as getCurrencies, banking_getSupportedAssets as getSupportedAssets, banking_lookupAccountByPhone as lookupAccountByPhone, banking_validateRecipientAccount as validateRecipientAccount };
}

declare function UploadMedia({ file, token, authCookieName, }: {
    file: File;
    token?: string;
    authCookieName?: string;
}): Promise<UploadMediaApi | {
    error: string;
}>;

declare const media_UploadMedia: typeof UploadMedia;
declare namespace media {
  export { media_UploadMedia as UploadMedia };
}

declare function GetWalletBalance({ currencySymbol, token, authCookieName, }: {
    currencySymbol: string;
    token?: string;
    authCookieName?: string;
}): Promise<GetWalletBalancesApi | {
    error: string;
}>;
declare function GetAccountBalance({ assetId, token, authCookieName, }: {
    assetId: string;
    token?: string;
    authCookieName?: string;
}): Promise<GetWalletBalancesApi | {
    error: string;
}>;
declare function GetJournalEntries({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<GetJournalEntriesApi | {
    error: string;
}>;
declare function GetFinancialLedger({ token, authCookieName, page, limit, }?: {
    token?: string;
    authCookieName?: string;
    page?: number;
    limit?: number;
}): Promise<FinancialLedgerApi | {
    error: string;
}>;
declare function GetTransactions({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<GetTransactionsApi | {
    error: string;
}>;
declare function CheckoutOrder({ storeKey, cartId, amount, idempotencyKey, currencyId, token, authCookieName, }: {
    cartId: string;
    amount: number;
    idempotencyKey: string;
    token?: string;
    authCookieName?: string;
    currencyId: string;
    storeKey?: 'trydos';
}): Promise<CheckoutOrderApi | {
    error: string;
}>;
declare function checkTransferBalance({ amount, currency, }: {
    amount: number;
    currency: string;
}): Promise<BalanceCheckResult>;
declare function getTransferPurposes({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<{
    error: string;
} | TransferPurpose[]>;
declare function verifyTransfer({ toAccountNumber, assetSymbol, assetType, amount, senderAvailableBalance, token, authCookieName, }: VerifyTransferRequest & {
    senderAvailableBalance?: number;
    token?: string;
    authCookieName?: string;
}): Promise<VerifyTransferResponse | {
    error: string;
}>;
declare function SendTransfer({ toAccountNumber, assetSymbol, assetType, amount, purposeId, note, inputMethod, idempotencyKey, token, authCookieName, }: TransferRequest & {
    token?: string;
    authCookieName?: string;
}): Promise<TransferResult | {
    error: string;
}>;
/**
 * Fetch deposit request details by requestMoneyId.
 * Mock implementation with test scenarios:
 *   - "expired-test"  → returns an already-expired request
 *   - "paid-test"     → returns an already-paid request with transfer result
 *   - "short-test"    → returns a request expiring in 30 seconds
 *   - any other ID    → returns a valid request expiring in 3 minutes
 */
declare function getDepositRequest({ requestMoneyId, }: {
    requestMoneyId: string;
    token?: string;
    authCookieName?: string;
}): Promise<DepositRequestData | {
    error: string;
}>;

declare const transactions_CheckoutOrder: typeof CheckoutOrder;
declare const transactions_GetAccountBalance: typeof GetAccountBalance;
declare const transactions_GetFinancialLedger: typeof GetFinancialLedger;
declare const transactions_GetJournalEntries: typeof GetJournalEntries;
declare const transactions_GetTransactions: typeof GetTransactions;
declare const transactions_GetWalletBalance: typeof GetWalletBalance;
declare const transactions_SendTransfer: typeof SendTransfer;
declare const transactions_checkTransferBalance: typeof checkTransferBalance;
declare const transactions_getDepositRequest: typeof getDepositRequest;
declare const transactions_getTransferPurposes: typeof getTransferPurposes;
declare const transactions_verifyTransfer: typeof verifyTransfer;
declare namespace transactions {
  export { transactions_CheckoutOrder as CheckoutOrder, transactions_GetAccountBalance as GetAccountBalance, transactions_GetFinancialLedger as GetFinancialLedger, transactions_GetJournalEntries as GetJournalEntries, transactions_GetTransactions as GetTransactions, transactions_GetWalletBalance as GetWalletBalance, transactions_SendTransfer as SendTransfer, transactions_checkTransferBalance as checkTransferBalance, transactions_getDepositRequest as getDepositRequest, transactions_getTransferPurposes as getTransferPurposes, transactions_verifyTransfer as verifyTransfer };
}

declare function checkWallet({ id, token, authCookieName, }: {
    id: string;
    token?: string;
    authCookieName?: string;
}): Promise<void>;
declare function createWallet({ id, token, authCookieName, }: {
    id: string;
    token?: string;
    authCookieName?: string;
}): Promise<FetchResponse<unknown> & {
    status: number;
}>;

declare const wallets_checkWallet: typeof checkWallet;
declare const wallets_createWallet: typeof createWallet;
declare namespace wallets {
  export { wallets_checkWallet as checkWallet, wallets_createWallet as createWallet };
}

/**
 * Validates the current user session.
 */
declare function verifyMe({ token, authCookieName, }?: {
    token?: string;
    authCookieName?: string;
}): Promise<User | {
    error: string;
}>;
/**
 * Initiates the OTP process for Sign In.
 */
declare function sendOtp({ phoneNumber, channel, email, type, }: {
    phoneNumber: string;
    channel: "sms" | "whatsapp";
    email?: string;
    type?: string;
}): Promise<SendOtpResponse | {
    error: string;
}>;
/**
 * Retries sending the OTP code.
 */
declare function reSendOtp({ phoneNumber, channel, type, }: {
    phoneNumber: string;
    channel: "sms" | "whatsapp";
    type?: string;
}): Promise<SendOtpResponse | {
    error: string;
}>;
/**
 * Verifies the OTP code and completes the login/registration process.
 */
declare function verifyOtp({ phoneNumber, otpCode, msegatId, sessionInfo, type, }: {
    phoneNumber: string;
    otpCode: string;
    msegatId?: number | string;
    sessionInfo?: string;
    type: "signIn" | "signUp";
}): Promise<VerifyOtpResponse | {
    error: string;
}>;

declare const auth_reSendOtp: typeof reSendOtp;
declare const auth_sendOtp: typeof sendOtp;
declare const auth_verifyMe: typeof verifyMe;
declare const auth_verifyOtp: typeof verifyOtp;
declare namespace auth {
  export { auth_reSendOtp as reSendOtp, auth_sendOtp as sendOtp, auth_verifyMe as verifyMe, auth_verifyOtp as verifyOtp };
}

declare function createPaymentRequest(input: CreatePaymentRequestInput & {
    token?: string;
    authCookieName?: string;
    baseUrl?: string;
    local?: string;
}): Promise<PaymentRequest | {
    error: string;
}>;
declare function lookupPaymentRequest(input: {
    code: string;
    token?: string;
    authCookieName?: string;
    baseUrl?: string;
    local?: string;
}): Promise<PaymentRequestLookup | {
    error: string;
}>;
declare function fulfillPaymentRequest(input: FulfillPaymentRequestInput & {
    token?: string;
    authCookieName?: string;
    baseUrl?: string;
    local?: string;
}): Promise<PaymentRequest | {
    error: string;
}>;
declare function cancelPaymentRequest(input: CancelPaymentRequestInput & {
    token?: string;
    authCookieName?: string;
    baseUrl?: string;
    local?: string;
}): Promise<PaymentRequest | {
    error: string;
}>;

declare const paymentRequests_cancelPaymentRequest: typeof cancelPaymentRequest;
declare const paymentRequests_createPaymentRequest: typeof createPaymentRequest;
declare const paymentRequests_fulfillPaymentRequest: typeof fulfillPaymentRequest;
declare const paymentRequests_lookupPaymentRequest: typeof lookupPaymentRequest;
declare namespace paymentRequests {
  export { paymentRequests_cancelPaymentRequest as cancelPaymentRequest, paymentRequests_createPaymentRequest as createPaymentRequest, paymentRequests_fulfillPaymentRequest as fulfillPaymentRequest, paymentRequests_lookupPaymentRequest as lookupPaymentRequest };
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

export { CalculateFees, CheckoutOrder, CreateBankDeposit, GetAccountBalance, GetBankDeposits, GetBanks, GetFinancialLedger, GetJournalEntries, GetTransactions, GetWalletBalance, SendTransfer, UploadMedia, auth, banking, cancelPaymentRequest, checkTransferBalance, checkWallet, core, createPaymentRequest, createWallet, fulfillPaymentRequest, getAccountByBalanceId, getCurrencies, getDepositRequest, getSupportedAssets, getTransferPurposes, lookupAccountByPhone, lookupPaymentRequest, media, paymentRequests, reSendOtp, sendOtp, transactions, validateRecipientAccount, verifyMe, verifyOtp, verifyTransfer, wallets };
