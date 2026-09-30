import { normalizePhoneDigits } from '@/lib/phoneValidation';
import type { RecipientAccountDetails } from '../types/transfers';

/**
 * "No account on this number" is an answer, not a failure: the sender goes on
 * to name the recipient instead. It is kept apart from `error` so a dropped
 * request can never be mistaken for it.
 */
export type PhoneLookupResult =
    | { status: 'found'; recipient: RecipientAccountDetails }
    | { status: 'not-found' }
    | { status: 'error'; message: string };

/** Numbers the mock treats as having an account. Digits only, no `+`. */
const REGISTERED_NUMBERS = ['963980033496', '963911000001'];

/**
 * MOCK — there is no phone-lookup endpoint yet.
 *
 * This is not an API call. It sleeps 1.5s and recognises two hardcoded numbers;
 * everything else "is not found". It lived in core/actions/banking.ts and was
 * the last thing keeping the entire injected-actions layer alive, so it was
 * lifted out here — named `.mock` so nobody mistakes it for a real endpoint.
 *
 * When NestJS grows a real route, delete this file and add
 * `lookupByPhone` to `endpoints/transfers.ts` alongside `lookupAccount`, then
 * map its response onto `PhoneLookupResult` in a helper next to
 * `resolveRecipient`. The call site changes by one line.
 */
export async function lookupAccountByPhoneMock(phoneNumber: string): Promise<PhoneLookupResult> {
    // Simulated latency, so the UI's loading state is exercised in development.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!REGISTERED_NUMBERS.includes(normalizePhoneDigits(phoneNumber))) {
        return { status: 'not-found' };
    }

    return {
        status: 'found',
        recipient: {
            found: true,
            accountNumber: '0000-0708',
            // Already masked, matching what the real lookup returns.
            name: 'R***** B***** T***** Y***** L***** S*****',
            maskedName: 'R***** B***** T***** Y***** L***** S*****',
        },
    };
}
