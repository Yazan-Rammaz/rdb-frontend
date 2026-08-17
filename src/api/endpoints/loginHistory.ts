import { request } from '../client';
import type { ApiResult, RequestOptions } from '../types/common';
import type { LoginHistoryQuery, LoginHistoryResponse } from '../types/loginHistory';

/**
 * Recent sign-ins for the current user.
 *
 * `Accept-Language` is forwarded because the backend localises the device and
 * location strings it returns.
 */
export const loginHistory = {
    list: (
        query: LoginHistoryQuery = {},
        o?: RequestOptions,
    ): Promise<ApiResult<LoginHistoryResponse>> => {
        const { page = 0, limit = 20, status, lang = 'en' } = query;
        return request({
            path: '/users/me/login-history',
            // `status` is dropped when undefined by buildUrl, so an unfiltered
            // call does not send an empty param.
            query: { page, limit, status },
            options: { ...o, headers: { 'Accept-Language': lang, ...o?.headers } },
        });
    },
};
