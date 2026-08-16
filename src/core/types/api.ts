import { Pagination, Timestamps, CursorPagination } from './shared';
import {
    BaseBank,
    FeeStructure,
    BaseAsset,
    AssetItem,
    PaytabConfig,
    BankDepositItem,
    Transaction,
} from './models';

/**
 * EXPORTED API RESPONSES
 */

export interface BanksApi extends Pagination {
    items: Array<
        BaseBank &
            Timestamps & {
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
                    currency: BaseAsset &
                        Timestamps & {
                            symbolImageUrl: string;
                            paytab: PaytabConfig;
                            isActive: boolean;
                        };
                }>;
            }
    >;
}

export interface CurrenciesApi extends Pagination {
    items: Array<
        BaseAsset &
            Timestamps & {
                displayName: string;
                symbolImageUrl: string;
                paytab: PaytabConfig;
            }
    >;
}

export interface SupportedAssetsApi {
    currencies: AssetItem[];
    metals: AssetItem[];
}

export interface UploadMediaApi extends Timestamps {
    id: string;
    url: string;
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    type: string;
    uploaderId: string;
    uploaderType: string;
    metadata: { purpose: string };
}

export interface CreateBankDepositApi extends BankDepositItem {}

export interface GetBankDepositApi extends Pagination {
    items: BankDepositItem[];
}

export interface CalculateFeesApi {
    amount: number;
    taxAmount: number;
    feeAmount: number;
    netAmount: number;
    totalDeductions: number;
    currencySymbol: string;
    bankNameEn: string;
    bankNameAr: string;
}

export interface GetWalletBalancesApi {
    currencySymbol: string;
    totalAvailable: number;
    totalLocked: number;
    totalValue: number;
    wallets: Array<
        Timestamps & {
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
        }
    >;
}

export interface GetAccountByBalanceIdApi {
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
    asset: {
        id: string;
        symbol: string;
        name: string;
    };
    accountSubtype: string;
}

export interface GetJournalEntriesApi extends CursorPagination {
    items: Array<
        Timestamps & {
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
        }
    >;
}

export interface GetTransactionsApi extends CursorPagination {
    items: Transaction[];
}

export interface CheckoutOrderApi {
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

export interface GetBankDepositeApi extends Pagination {
    items: BankDepositItem[];
}

// Financial Ledger API Response
export interface FinancialLedgerAccount {
    id: string;
    accountNumber: string;
    name: string;
}

export interface FinancialLedgerMetadata {
    purposeId?: string;
    purposeName?: string;
    inputMethod?: 'MANUAL' | 'QR';
    note?: string;
    paymentRequestId?: string;
    requestCode?: string;
    expiresAt?: string | null;
    isPermanent?: boolean;
}

export interface FinancialLedgerItem {
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
    // These fields will be added by backend later
    senderAccount?: FinancialLedgerAccount;
    receiverAccount?: FinancialLedgerAccount;
    createdAt: string;
    updatedAt: string;
}

export interface FinancialLedgerApi extends Pagination {
    items: FinancialLedgerItem[];
}

/**
 * Step-up authentication requirement.
 *
 * A gated NestJS action (transfer, withdraw, forgot-passcode, …) may decline to
 * complete and instead return a step-up requirement. The client runs the matching
 * challenge (a face re-verification for `method: 'face'`), then retries the action
 * carrying the resulting step token. The pass/fail decision is made ONLY in NestJS.
 */
export interface StepUpRequirement {
    method: 'face' | 'otp';
    challengeId: string;
    reason?: string;
}

/**
 * Helper shape for any response that MAY carry a step-up requirement. NestJS sets
 * `stepUp` (and conventionally `requireFaceVerification`/`requireOtpVerification`
 * booleans) instead of completing the action.
 */
export interface StepUpEnvelope {
    stepUp?: StepUpRequirement;
    requireFaceVerification?: boolean;
    requireOtpVerification?: boolean;
}
