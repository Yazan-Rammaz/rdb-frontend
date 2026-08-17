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
 * recipient name and amount before anything moves. Never call `send` without
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
            options: {
                ...o,
                headers: { 'x-lang': langCode(), ...o?.headers },
            },
        }),

    /**
     * Resolves an account number to a display name before the sender commits.
     */
    lookupAccount: (
        accountNumber: string,
        o?: RequestOptions,
    ): Promise<ApiResult<LookupAccountResponse>> =>
        request({
            // Encoded here, not by the caller — an account number containing a
            // slash must not be able to alter the path.
            path: `/transfers/lookup-account/${encodeURIComponent(accountNumber)}`,
            options: o,
        }),

    verify: (
        body: VerifyTransferBody,
        o?: RequestOptions,
    ): Promise<ApiResult<VerifyTransferResponse>> =>
        request({ path: '/transfers/verify', method: 'POST', body, options: o }),

    /**
     * Commits the transfer.
     *
     * `idempotencyKey` must be stable across retries of the same transfer — a
     * retry after a timeout that generates a fresh key charges the user twice.
     */
    send: (body: SendTransferBody, o?: RequestOptions): Promise<ApiResult<SendTransferResponse>> =>
        request({
            path: '/transfers/send',
            method: 'POST',
            // `note` is normalised to '' rather than omitted, matching what the
            // previous action sent — NestJS has been receiving a string here.
            body: { ...body, note: body.note || '' },
            options: o,
        }),
};
