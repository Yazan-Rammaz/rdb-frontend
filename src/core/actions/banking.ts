import {
    BanksApi,
    CalculateFeesApi,
    CreateBankDepositApi,
    CurrenciesApi,
    SupportedAssetsApi,
    FetchResponse,
    GetBankDepositApi,
} from '../types';
import type { RecipientAccountDetails } from '../types/transfer';
import { fetchServerData, processResponse } from '../utils';
import { initialData } from '@/rdb/types/RDBProps';

export async function getSupportedAssets({
    token,
    authCookieName,
}: {
    token?: string;
    authCookieName?: string;
} = {}): Promise<SupportedAssetsApi | { error: string }> {
    try {
        const headers: Record<string, string> = {};
        const countryCode = initialData.CountryCode;
        if (countryCode) {
            headers['x-country-code'] = countryCode;
        }

        let response = await fetchServerData({
            method: 'GET',
            url: '/assets/supported',
            token,
            authCookieName,
            headers,
        });

        return processResponse<SupportedAssetsApi | { error: string }>(response);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/** @deprecated Use getSupportedAssets() instead */
export async function getCurrencies({
    token,
    authCookieName,
}: {
    token?: string;
    authCookieName?: string;
} = {}): Promise<CurrenciesApi | { error: string }> {
    try {
        const result = await getSupportedAssets({ token, authCookieName });
        if ('error' in result) {
            return result;
        }
        return {
            items: result.currencies as unknown as CurrenciesApi['items'],
            total: result.currencies.length,
            page: 1,
            limit: result.currencies.length,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function GetBanks({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}) {
    try {
        let response: FetchResponse<BanksApi> = await fetchServerData({
            method: 'GET',
            url: '/banks',
            token,
            authCookieName,
        });

        return processResponse<BanksApi | { error: string }>(response);
    } catch (error) {
        console.error(error);
    }
}

export async function CreateBankDeposit({
    bankId,
    currencyId,
    amount,
    transferImageUrl,
    transactionReference,
    idempotencyKey,
    token,
    authCookieName,
}: {
    bankId: string;
    currencyId: string;
    amount: number;
    transferImageUrl: string;
    transactionReference: string;
    idempotencyKey: string;
    token?: string;
    authCookieName?: string;
}) {
    let response: FetchResponse<CreateBankDepositApi> = await fetchServerData({
        method: 'POST',
        body: JSON.stringify({
            bankId,
            currencyId,
            amount,
            transferImageUrl,
            transactionReference,
            idempotencyKey,
        }),
        url: '/bank-deposits',
        token,
        authCookieName,
    });

    return processResponse<CreateBankDepositApi | { error: string }>(response);
}

export async function CalculateFees({
    bankId,
    currencyId,
    amount,
    token,
    authCookieName,
}: {
    bankId: string;
    currencyId: string;
    amount: number;
    token?: string;
    authCookieName?: string;
}) {
    let response: FetchResponse<CalculateFeesApi> = await fetchServerData({
        method: 'POST',
        body: JSON.stringify({
            bankId,
            currencyId,
            amount,
        }),
        url: '/bank-deposits/calculate-fees',
        token,
        authCookieName,
    });

    return processResponse<CalculateFeesApi | { error: string }>(response);
}

export async function GetBankDeposits({
    token,
    authCookieName,
}: { token?: string; authCookieName?: string } = {}) {
    let response: FetchResponse<GetBankDepositApi> = await fetchServerData({
        method: 'GET',
        url: '/bank-deposits',
        token,
        authCookieName,
    });

    return processResponse<GetBankDepositApi | { error: string }>(response);
}

export async function getAccountByBalanceId({
    balanceId,
    token,
    authCookieName,
}: {
    balanceId: string;
    token?: string;
    authCookieName?: string;
}): Promise<
    | {
          accountName: string;
          accountNumber: string;
          username: string;
          profilePicture: string;
          currency: string;
          initials: string;
      }
    | { error: string }
> {
    try {
        // Simulate 2-second delay to fetch from backend
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock API response - Replace with actual API call when endpoint is ready
        const response = {
            accountName: 'FirstName LastName',
            accountNumber: balanceId,
            username: '@username.com',
            profilePicture: '', // Can be a URL or base64
            currency: 'USD',
            initials: 'FL',
        };

        return response;

        // When API is ready, use this instead:
        // let response: FetchResponse<AccountByBalanceIdApi> = await fetchServerData({
        //     method: 'GET',
        //     url: `/accounts/balance/${balanceId}`,
        // });
        // return processResponse<AccountByBalanceIdApi | { error: string }>(response);
    } catch (error) {
        console.error('Error fetching account by balance ID:', error);
        return { error: 'Failed to fetch account details' };
    }
}

export async function validateRecipientAccount({
    accountNumber,
    token,
    authCookieName,
}: {
    accountNumber: string;
    token?: string;
    authCookieName?: string;
}): Promise<RecipientAccountDetails | { error: string }> {
    try {
        // Ensure format is xxxx-xxxx
        const formatted = accountNumber.includes('-')
            ? accountNumber
            : `${accountNumber.slice(0, 4)}-${accountNumber.slice(4)}`;

        const response: FetchResponse<{
            found: boolean;
            accountNumber: string;
            name: string;
        }> = await fetchServerData({
            method: 'GET',
            url: `/transfers/lookup-account/${encodeURIComponent(formatted)}`,
            token,
            authCookieName,
        });

        const result = await processResponse<{
            found: boolean;
            accountNumber: string;
            name: string;
        }>(response);

        if ('error' in result) {
            return { error: result.error };
        }

        if (!result.found) {
            return { error: 'Account not found. Please verify the account number.' };
        }

        return {
            found: result.found,
            accountNumber: result.accountNumber,
            name: result.name,
            maskedName: result.name, // API returns pre-masked name like "P***y W."
        };
    } catch (error) {
        console.error('Error validating recipient account:', error);
        return { error: 'Failed to validate account. Please try again.' };
    }
}

export async function lookupAccountByPhone({
    phoneNumber,
}: {
    phoneNumber: string;
}): Promise<RecipientAccountDetails | { error: string }> {
    try {
        // Simulate 1.5-second delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock: phone +963980033496 maps to account 0000-0708
        const cleaned = phoneNumber.replace(/[\s-]/g, '');
        if (cleaned === '+963980033496' || cleaned === '963911000001') {
            return {
                found: true,
                accountNumber: '0000-0708',
                name: 'R***** B***** T***** Y***** L***** S*****',
                maskedName: 'R***** B***** T***** Y***** L***** S*****',
            };
        }

        return { error: 'Account not found. Please verify the phone number.' };
    } catch (error) {
        console.error('Error looking up account by phone:', error);
        return { error: 'Failed to lookup account. Please try again.' };
    }
}
