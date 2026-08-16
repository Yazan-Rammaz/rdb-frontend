import type { ILoginHistoryService } from './loginHistory.interface';
import type { LoginHistoryResponse, LoginStatus } from '@/core/types/loginHistory';
import { apiFetch } from '@/core/utils';

/**
 * Calls the real backend `GET /users/me/login-history` through the app's `/api`
 * proxy, which injects the Bearer token and forwards `Accept-Language`. 401s are
 * handled inside `apiFetch` (refresh/retry, else logout).
 */
export class HttpLoginHistoryService implements ILoginHistoryService {
    async getRecentLogins(params?: {
        page?: number;
        limit?: number;
        status?: LoginStatus;
        lang?: string;
    }): Promise<LoginHistoryResponse> {
        const page = params?.page ?? 0;
        const limit = params?.limit ?? 20;
        const lang = params?.lang ?? 'en';

        let path = `/api/users/me/login-history?page=${page}&limit=${limit}`;
        if (params?.status) path += `&status=${params.status}`;

        const res = await apiFetch(path, { headers: { 'Accept-Language': lang } });
        if (!res.ok) throw new Error(`login-history request failed (${res.status})`);
        return (await res.json()) as LoginHistoryResponse;
    }
}
