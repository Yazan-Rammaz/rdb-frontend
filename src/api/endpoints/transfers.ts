import { request } from '../client';
import { initialData } from '@/config/runtime';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    LookupAccountResponse,
    SendTransferBody,
    SendTransferResponse,
    TransferPurposeListResponse,
    VerifyTransferBody,
    VerifyTransferResponse,
} from '../types/transfers';

/** Language code NestJS expects in x-lang — 'en-gb' → 'en'. */
function langCode(): string {
    return (initialData.Locale || 'en-gb').split('-')[0];
}

/**
 * Money movement.
 *
 * `verify` then `send` is a deliberate two-step: the sender confirms a resolved
 * name and a quoted total before anything moves. Never call `send` without
 * showing the user what `verify` returned.
 */
export const transfers = {
    /**
     * Purpose-of-transfer options.
     *
     * `x-lang` is sent because NestJS localises the purpose names from that
     * header, not Accept-Language. It is set per-endpoint rather than globally:
     * adding it to every request would change response text across the app,
     * which is a product decision, not part of this migration.
     */
    purposes: (o?: RequestOptions): Promise<ApiResult<TransferPurposeListResponse>> =>
        request({
            path: '/transfer-purpose',
            query: { type: 'ALL' },
            options: {
                ...o,
                headers: { 'x-lang': langCode(), ...o?.headers },
            },
        }),

    lookupAccount: (accountNumber: string, o?: RequestOptions): Promise<ApiResult<LookupAccountResponse>> =>
        request({
            path: `/transfers/lookup-account/${encodeURIComponent(accountNumber)}`,
            options: o,
        }),

    verify: (body: VerifyTransferBody, o?: RequestOptions): Promise<ApiResult<VerifyTransferResponse>> =>
        request({ path: '/transfers/verify', method: 'POST', body, options: o }),

    send: (body: SendTransferBody, o?: RequestOptions): Promise<ApiResult<SendTransferResponse>> =>
        request({ path: '/transfers/send', method: 'POST', body, options: o }),
};
