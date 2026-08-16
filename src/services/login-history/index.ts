import type { ILoginHistoryService } from './loginHistory.interface';
import { HttpLoginHistoryService } from './httpLoginHistoryService';

let instance: ILoginHistoryService | null = null;

/**
 * Login History service factory (mirrors services/kyc/index.ts).
 * Returns the HTTP implementation backed by the real backend endpoint.
 */
export function createLoginHistoryService(): ILoginHistoryService {
    if (instance) return instance;
    instance = new HttpLoginHistoryService();
    return instance;
}

export type { ILoginHistoryService } from './loginHistory.interface';
