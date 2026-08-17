import type { ILoginHistoryService } from './loginHistory.interface';
import type { LoginHistoryResponse, LoginStatus } from '@/core/types/loginHistory';
import { api } from '@/api';

/**
 * Calls the real backend `GET /users/me/login-history` through `api.loginHistory`,
 * which injects the Bearer token and forwards `Accept-Language`. 401s refresh and
 * retry inside the api client, else log out.
 *
 * Keeps the throwing ILoginHistoryService contract its mock also implements.
 */
export class HttpLoginHistoryService implements ILoginHistoryService {
    async getRecentLogins(params?: {
        page?: number;
        limit?: number;
        status?: LoginStatus;
        lang?: string;
    }): Promise<LoginHistoryResponse> {
        const res = await api.loginHistory.list(params ?? {});
        if (!res.ok) throw new Error(`login-history request failed: ${res.error.message}`);
        return res.data;
    }
}
