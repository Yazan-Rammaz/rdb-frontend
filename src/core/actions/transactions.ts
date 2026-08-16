import {
    CheckoutOrderApi,
    FetchResponse,
    FinancialLedgerApi,
    GetJournalEntriesApi,
    GetTransactionsApi,
    GetWalletBalancesApi,
} from '../types';
import { initialData } from '@/config/runtime';
import type {
    BalanceCheckResult,
    PaymentRequestData,
    TransferPurpose,
    TransferRequest,
    TransferResult,
    VerifyTransferRequest,
    VerifyTransferResponse,
} from '../types/transfer';
import { fetchServerData, processResponse } from '../utils';

export async function GetWalletBalance({
    currencySymbol,
    token,
    authCookieName,
}: {
    currencySymbol: string;
    token?: string;
    authCookieName?: string;
}) {
    console.log('Fetching wallet balance for currency:', currencySymbol);
    let response: FetchResponse<GetWalletBalancesApi> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/wallets/myAcounts?currencySymbol=${encodeURIComponent(currencySymbol)}`,
    });

    return processResponse<GetWalletBalancesApi>(response);
}

export async function GetAccountBalance({
    assetId,
    token,
    authCookieName,
}: {
    assetId: string;
    token?: string;
    authCookieName?: string;
}) {
    let response: FetchResponse<GetWalletBalancesApi> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/wallets/my/balances/${encodeURIComponent(assetId)}`,
    });

    return processResponse<GetWalletBalancesApi>(response);
}

export async function GetJournalEntries({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}) {
    let response: FetchResponse<GetJournalEntriesApi> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/wallets/my/journal-entries`,
    });

    return processResponse<GetJournalEntriesApi>(response);
}

export async function GetFinancialLedger({
    token,
    authCookieName,
    page = 0,
    limit = 10,
    assetSymbol,
}: {
    token?: string;
    authCookieName?: string;
    page?: number;
    limit?: number;
    assetSymbol?: string;
} = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (assetSymbol) params.set('assetSymbol', assetSymbol);
    let response: FetchResponse<FinancialLedgerApi> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/financial-ledger?${params.toString()}`,
    });

    return processResponse<FinancialLedgerApi>(response);
}

export async function GetTransactions({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}) {
    let response: FetchResponse<GetTransactionsApi> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/wallets/my/transactions`,
    });

    return processResponse<GetTransactionsApi>(response);
}

export async function CheckoutOrder({
    storeKey = 'trydos',
    cartId,
    amount,
    idempotencyKey,
    currencyId,
    token,
    authCookieName,
}: {
    cartId: string;
    amount: number;
    idempotencyKey: string;
    token?: string;
    authCookieName?: string;
    currencyId: string;
    storeKey?: 'trydos';
}) {
    let response: FetchResponse<CheckoutOrderApi> = await fetchServerData({
        method: 'POST',

        body: JSON.stringify({
            currencyId: currencyId,
            carts: [
                {
                    cartId: cartId,
                    amount: amount,
                },
            ],
            idempotencyKey: idempotencyKey,
        }),
        url: `/wallets/${storeKey}/checkout`,
        token,
        authCookieName,
    });

    return processResponse<CheckoutOrderApi>(response);
}

export async function checkTransferBalance({
    amount,
    currency,
}: {
    amount: number;
    currency: string;
}): Promise<BalanceCheckResult> {
    // Simulate 1-second delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock: sender has 1000 available
    const available = 1000;
    return {
        sufficient: amount <= available,
        available,
    };
}

export async function getTransferPurposes({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}) {
    let response: FetchResponse<TransferPurpose[]> = await fetchServerData({
        method: 'GET',
        token,
        authCookieName,
        url: `/transfer-purpose?type=ALL`,
        headers: {
            'x-lang': (initialData.Locale || 'en-gb').split('-')[0],
        },
    });

    return processResponse<TransferPurpose[]>(response);
}

export async function verifyTransfer({
    toAccountNumber,
    assetSymbol,
    assetType,
    amount,
    senderAvailableBalance,
    token,
    authCookieName,
}: VerifyTransferRequest & {
    senderAvailableBalance?: number;
    token?: string;
    authCookieName?: string;
}): Promise<VerifyTransferResponse | { error: string }> {
    if (senderAvailableBalance !== undefined && amount > senderAvailableBalance) {
        return {
            valid: false,
            sender: { accountNumber: '', name: '', availableBalance: senderAvailableBalance },
            receiver: { accountNumber: toAccountNumber, name: '' },
            currency: { symbol: assetSymbol, name: assetSymbol },
            amount,
        };
    }
    try {
        const response: FetchResponse<VerifyTransferResponse> = await fetchServerData({
            method: 'POST',
            url: '/transfers/verify',
            body: {
                toAccountNumber,
                assetSymbol,
                assetType,
                amount,
            },
            token,
            authCookieName,
        });

        const result = await processResponse<VerifyTransferResponse>(response);
        return result;
    } catch (error) {
        console.error('Error verifying transfer:', error);
        return { error: 'Failed to verify transfer. Please try again.' };
    }
}

export async function SendTransfer({
    toAccountNumber,
    assetSymbol,
    assetType,
    amount,
    purposeId,
    note,
    inputMethod,
    idempotencyKey,
    token,
    authCookieName,
}: TransferRequest & {
    token?: string;
    authCookieName?: string;
}): Promise<TransferResult | { error: string }> {
    try {
        const response: FetchResponse<TransferResult> = await fetchServerData({
            method: 'POST',
            url: '/transfers/send',
            body: {
                toAccountNumber,
                assetSymbol,
                assetType,
                amount,
                purposeId,
                note: note || '',
                inputMethod,
                idempotencyKey,
            },
            token,
            authCookieName,
        });

        const result = await processResponse<TransferResult>(response);
        return result;
    } catch (error) {
        console.error('Error sending transfer:', error);
        return { error: 'Transfer failed. Please try again.' };
    }
}

/**
 * Fetch Payement Request details by requestMoneyId.
 * Mock implementation with test scenarios:
 *   - "expired-test"  → returns an already-expired request
 *   - "paid-test"     → returns an already-paid request with transfer result
 *   - "short-test"    → returns a request expiring in 30 seconds
 *   - any other ID    → returns a valid request expiring in 3 minutes
 */
export async function getPaymentRequest({
    requestMoneyId,
}: {
    requestMoneyId: string;
    token?: string;
    authCookieName?: string;
}): Promise<PaymentRequestData | { error: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = new Date();

    // Test scenario: already expired
    if (requestMoneyId === 'expired-test') {
        const past = new Date(now.getTime() - 60_000); // 1 minute ago
        return {
            requestMoneyId: '100',
            accountNumber: '0000-0708',
            accountName: 'Primary Funding Wallet',
            maskedName: 'R***** B***** T********** Y***** L******* S*****',
            currency: 'USD',
            amount: 100,
            reference: '101213',
            purposeId: 'work_partnership',
            purposeName: 'Work/Partnership',
            type: 'Payement Request',
            expiresAt: past.toISOString(),
            isPaid: false,
        };
    }

    // Test scenario: already paid
    if (requestMoneyId === 'paid-test') {
        return {
            requestMoneyId: '101',
            accountNumber: '0000-0708',
            accountName: 'Primary Funding Wallet',
            maskedName: 'R***** B***** T********** Y***** L******* S*****',
            currency: 'USD',
            amount: 100,
            reference: '101213',
            purposeId: 'work_partnership',
            purposeName: 'Work/Partnership',
            type: 'Payement Request',
            expiresAt: new Date(now.getTime() + 180_000).toISOString(),
            isPaid: true,
            transferResult: {
                transferId: 'TSCR10012',
                status: 'COMPLETED',
                sender: { accountNumber: '100-1128', name: 'M***** A*****', balanceAfter: 900 },
                receiver: { accountNumber: '100-708', name: 'R***** B*****' },
                currency: { symbol: 'USD', name: 'US Dollar' },
                amount: 100,
                purpose: 'Work/Partnership',
                createdAt: new Date(now.getTime() - 300_000).toISOString(),
            },
        };
    }

    // Test scenario: short expiry (30 seconds)
    if (requestMoneyId === 'short-test') {
        return {
            requestMoneyId: '102',
            accountNumber: '0000-0708',
            accountName: 'Primary Funding Wallet',
            maskedName: 'R***** B***** T********** Y***** L******* S*****',
            currency: 'USD',
            amount: 50,
            reference: '998877',
            purposeId: 'service_payment',
            purposeName: 'Service Payment',
            type: 'Payement Request',
            expiresAt: new Date(now.getTime() + 30_000).toISOString(),
            isPaid: false,
        };
    }

    // Default: valid request expiring in 3 minutes
    return {
        requestMoneyId: requestMoneyId,
        accountNumber: '0000-0708',
        accountName: 'Primary Funding Wallet',
        maskedName: 'R***** B***** T********** Y***** L******* S*****',
        currency: 'USD',
        amount: 100,
        reference: '101213',
        purposeId: 'work_partnership',
        purposeName: 'Work/Partnership',
        type: 'Payement Request',
        expiresAt: new Date(now.getTime() + 180_000).toISOString(),
        isPaid: false,
        note: '',
    };
}
