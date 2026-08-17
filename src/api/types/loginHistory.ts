/**
 * Types for `endpoints/loginHistory.ts`.
 *
 * The response model lives in `core/types/loginHistory.ts` and is re-exported
 * here rather than redeclared — same rule as the other type modules.
 */

import type { LoginHistoryResponse, LoginStatus } from '@/core/types/loginHistory';
export type { LoginHistoryResponse, LoginStatus };

export interface LoginHistoryQuery {
    /** Zero-based. Defaults to 0. */
    page?: number;
    /** Defaults to 20. */
    limit?: number;
    /** Omit for all statuses. */
    status?: LoginStatus;
    /** Sent as Accept-Language; the backend localises device/location strings. */
    lang?: string;
}
