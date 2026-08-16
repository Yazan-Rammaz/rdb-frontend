import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    LookupAccountResponse,
    SendTransferBody,
    SendTransferResponse,
    TransferPurposeListResponse,
    VerifyTransferBody,
    VerifyTransferResponse,
} from '../types/transfers';

/**
 * Money movement.
 *
 * `verify` then `send` is a deliberate two-step: the sender confirms a resolved
 * name and a quoted total before anything moves. Never call `send` without
 * showing the user what `verify` returned.
 */
export const transfers = {
    purposes: (o?: RequestOptions): Promise<ApiResult<TransferPurposeListResponse>> =>
        request({ path: '/transfer-purpose', query: { type: 'ALL' }, options: o }),

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
