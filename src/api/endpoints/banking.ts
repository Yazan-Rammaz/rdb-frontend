import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    AssetListResponse,
    BankDepositListResponse,
    BankListResponse,
    CalculateFeesBody,
    CreateBankDepositBody,
    CreateBankDepositResponse,
    FeeQuote,
} from '../types/banking';

/** Supported assets, banks, and bank deposits. */
export const banking = {
    assets: (o?: RequestOptions): Promise<ApiResult<AssetListResponse>> =>
        request({ path: '/assets/supported', options: o }),

    banks: (o?: RequestOptions): Promise<ApiResult<BankListResponse>> =>
        request({ path: '/banks', options: o }),

    deposits: (o?: RequestOptions): Promise<ApiResult<BankDepositListResponse>> =>
        request({ path: '/bank-deposits', options: o }),

    createDeposit: (
        body: CreateBankDepositBody,
        o?: RequestOptions,
    ): Promise<ApiResult<CreateBankDepositResponse>> =>
        request({ path: '/bank-deposits', method: 'POST', body, options: o }),

    calculateFees: (body: CalculateFeesBody, o?: RequestOptions): Promise<ApiResult<FeeQuote>> =>
        request({ path: '/bank-deposits/calculate-fees', method: 'POST', body, options: o }),
};
