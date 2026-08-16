import { C as CalculateFeesApi, c as CheckoutOrderApi, a as CreateBankDepositApi, d as GetWalletBalancesApi, G as GetBankDepositApi, B as BanksApi, F as FinancialLedgerApi, e as GetJournalEntriesApi, f as GetTransactionsApi, g as TransferResult, U as UploadMediaApi, P as PaymentRequest, h as BalanceCheckResult, k as FetchResponse, b as CurrenciesApi, D as DepositRequestData, S as SupportedAssetsApi, R as RecipientAccountDetails, i as TransferPurpose, j as VerifyTransferResponse, l as SendOtpResponse, n as VerifyOtpResponse, m as User, r as PaymentRequestLookup } from '../payment-requests-DmS1jRd2.mjs';

declare const getSupportedAssets: (args: any) => Promise<SupportedAssetsApi | {
    error: string;
}>;
declare const getCurrencies: (args: any) => Promise<CurrenciesApi | {
    error: string;
}>;
declare const GetBanks: (args: any) => Promise<BanksApi | {
    error: string;
} | undefined>;
declare const CreateBankDeposit: (args: any) => Promise<{
    error: string;
} | CreateBankDepositApi | {
    error: string;
}>;
declare const GetBankDeposits: (args: any) => Promise<{
    error: string;
} | GetBankDepositApi | {
    error: string;
}>;
declare const CalculateFees: (args: any) => Promise<{
    error: string;
} | CalculateFeesApi | {
    error: string;
}>;
declare const UploadMedia: (args: any) => Promise<{
    error: string;
} | UploadMediaApi>;
declare const GetWalletBalance: (args: any) => Promise<{
    error: string;
} | GetWalletBalancesApi>;
declare const GetAccountBalance: (args: any) => Promise<{
    error: string;
} | GetWalletBalancesApi>;
declare const getAccountByBalanceId: (args: any) => Promise<{
    accountName: string;
    accountNumber: string;
    username: string;
    profilePicture: string;
    currency: string;
    initials: string;
} | {
    error: string;
}>;
declare const validateRecipientAccount: (args: any) => Promise<RecipientAccountDetails | {
    error: string;
}>;
declare const lookupAccountByPhone: (args: any) => Promise<RecipientAccountDetails | {
    error: string;
}>;
declare const GetJournalEntries: (args: any) => Promise<{
    error: string;
} | GetJournalEntriesApi>;
declare const GetFinancialLedger: (args: any) => Promise<{
    error: string;
} | FinancialLedgerApi>;
declare const GetTransactions: (args: any) => Promise<{
    error: string;
} | GetTransactionsApi>;
declare const CheckoutOrder: (args: any) => Promise<{
    error: string;
} | CheckoutOrderApi>;
declare const checkTransferBalance: (args: any) => Promise<BalanceCheckResult>;
declare const getTransferPurposes: (args: any) => Promise<{
    error: string;
} | TransferPurpose[]>;
declare const verifyTransfer: (args: any) => Promise<VerifyTransferResponse | {
    error: string;
}>;
declare const SendTransfer: (args: any) => Promise<TransferResult | {
    error: string;
}>;
declare const getDepositRequest: (args: any) => Promise<DepositRequestData | {
    error: string;
}>;
declare const createPaymentRequest: (args: any) => Promise<PaymentRequest | {
    error: string;
}>;
declare const lookupPaymentRequest: (args: any) => Promise<PaymentRequestLookup | {
    error: string;
}>;
declare const fulfillPaymentRequest: (args: any) => Promise<PaymentRequest | {
    error: string;
}>;
declare const cancelPaymentRequest: (args: any) => Promise<PaymentRequest | {
    error: string;
}>;
declare const checkWallet: (args: any) => Promise<void>;
declare const createWallet: (args: any) => Promise<FetchResponse<unknown> & {
    status: number;
}>;
declare const sendOtp: (args: any) => Promise<SendOtpResponse | {
    error: string;
}>;
declare const reSendOtp: (args: any) => Promise<SendOtpResponse | {
    error: string;
}>;
declare const verifyOtp: (args: any) => Promise<VerifyOtpResponse | {
    error: string;
}>;
declare const verifyMe: (args: any) => Promise<User | {
    error: string;
}>;
declare function getServerActions(): Promise<{
    readonly banking: {
        readonly getSupportedAssets: (args: any) => Promise<SupportedAssetsApi | {
            error: string;
        }>;
        readonly getCurrencies: (args: any) => Promise<CurrenciesApi | {
            error: string;
        }>;
        readonly GetBanks: (args: any) => Promise<BanksApi | {
            error: string;
        } | undefined>;
        readonly CreateBankDeposit: (args: any) => Promise<{
            error: string;
        } | CreateBankDepositApi | {
            error: string;
        }>;
        readonly GetBankDeposits: (args: any) => Promise<{
            error: string;
        } | GetBankDepositApi | {
            error: string;
        }>;
        readonly CalculateFees: (args: any) => Promise<{
            error: string;
        } | CalculateFeesApi | {
            error: string;
        }>;
        readonly getAccountByBalanceId: (args: any) => Promise<{
            accountName: string;
            accountNumber: string;
            username: string;
            profilePicture: string;
            currency: string;
            initials: string;
        } | {
            error: string;
        }>;
        readonly validateRecipientAccount: (args: any) => Promise<RecipientAccountDetails | {
            error: string;
        }>;
        readonly lookupAccountByPhone: (args: any) => Promise<RecipientAccountDetails | {
            error: string;
        }>;
    };
    readonly media: {
        readonly UploadMedia: (args: any) => Promise<{
            error: string;
        } | UploadMediaApi>;
    };
    readonly transactions: {
        readonly GetWalletBalance: (args: any) => Promise<{
            error: string;
        } | GetWalletBalancesApi>;
        readonly GetJournalEntries: (args: any) => Promise<{
            error: string;
        } | GetJournalEntriesApi>;
        readonly GetFinancialLedger: (args: any) => Promise<{
            error: string;
        } | FinancialLedgerApi>;
        readonly GetTransactions: (args: any) => Promise<{
            error: string;
        } | GetTransactionsApi>;
        readonly CheckoutOrder: (args: any) => Promise<{
            error: string;
        } | CheckoutOrderApi>;
        readonly checkTransferBalance: (args: any) => Promise<BalanceCheckResult>;
        readonly getTransferPurposes: (args: any) => Promise<{
            error: string;
        } | TransferPurpose[]>;
        readonly verifyTransfer: (args: any) => Promise<VerifyTransferResponse | {
            error: string;
        }>;
        readonly SendTransfer: (args: any) => Promise<TransferResult | {
            error: string;
        }>;
        readonly getDepositRequest: (args: any) => Promise<DepositRequestData | {
            error: string;
        }>;
    };
    readonly wallets: {
        readonly checkWallet: (args: any) => Promise<void>;
        readonly createWallet: (args: any) => Promise<FetchResponse<unknown> & {
            status: number;
        }>;
    };
    readonly auth: {
        readonly sendOtp: (args: any) => Promise<SendOtpResponse | {
            error: string;
        }>;
        readonly reSendOtp: (args: any) => Promise<SendOtpResponse | {
            error: string;
        }>;
        readonly verifyOtp: (args: any) => Promise<VerifyOtpResponse | {
            error: string;
        }>;
        readonly verifyMe: (args: any) => Promise<User | {
            error: string;
        }>;
    };
    readonly paymentRequests: {
        readonly createPaymentRequest: (args: any) => Promise<PaymentRequest | {
            error: string;
        }>;
        readonly lookupPaymentRequest: (args: any) => Promise<PaymentRequestLookup | {
            error: string;
        }>;
        readonly fulfillPaymentRequest: (args: any) => Promise<PaymentRequest | {
            error: string;
        }>;
        readonly cancelPaymentRequest: (args: any) => Promise<PaymentRequest | {
            error: string;
        }>;
    };
}>;

export { CalculateFees, CheckoutOrder, CreateBankDeposit, GetAccountBalance, GetBankDeposits, GetBanks, GetFinancialLedger, GetJournalEntries, GetTransactions, GetWalletBalance, SendTransfer, UploadMedia, cancelPaymentRequest, checkTransferBalance, checkWallet, createPaymentRequest, createWallet, fulfillPaymentRequest, getAccountByBalanceId, getCurrencies, getDepositRequest, getServerActions, getSupportedAssets, getTransferPurposes, lookupAccountByPhone, lookupPaymentRequest, reSendOtp, sendOtp, validateRecipientAccount, verifyMe, verifyOtp, verifyTransfer };
