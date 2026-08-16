import type { LoginHistoryResponse, LoginStatus } from '@/core/types/loginHistory';

/**
 * The UI depends only on this interface. The HTTP implementation calls the real
 * backend through the app's authenticated proxy.
 * See specs/login-history/contracts/login-history-service.md.
 */
export interface ILoginHistoryService {
    /**
     * Fetch the current user's login history (newest first).
     * @param params.page   0-indexed (default 0)
     * @param params.limit  1–100 (default 20)
     * @param params.status optional filter: 'success' | 'failure'
     * @param params.lang   app language for the localized failureReasonLabel ('en' | 'ar')
     */
    getRecentLogins(params?: {
        page?: number;
        limit?: number;
        status?: LoginStatus;
        lang?: string;
    }): Promise<LoginHistoryResponse>;
}
