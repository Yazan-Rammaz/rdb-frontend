export type { SelectOption } from '../shared/types';

export interface FormData {
    accountName: string;
    accountNumber: string;
    currency: string;
    amount: string;
    reference: string;
    purpose: string;
    validity: string;
    note: string;
    displayedAccountName: string;
}

export type Mode = 'address' | 'request' | 'review';

/** Re-export under the old name so existing imports keep working. */
export type FormDataTypes = FormData;
