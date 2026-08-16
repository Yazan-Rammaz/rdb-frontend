import type { RecipientAccountDetails } from '../types/transfers';

/**
 * MOCK — there is no phone-lookup endpoint yet.
 *
 * This is not an API call. It sleeps 1.5s and recognises two hardcoded numbers;
 * everything else "is not found". It lived in core/actions/banking.ts and was
 * the last thing keeping the entire injected-actions layer alive, so it was
 * lifted out here — named `.mock` so nobody mistakes it for a real endpoint.
 *
 * When NestJS grows a real route, delete this file and add
 * `lookupByPhone` to `endpoints/transfers.ts` alongside `lookupAccount`. The
 * return shape already matches `resolveRecipient`, so the call site changes by
 * one line.
 */
export async function lookupAccountByPhoneMock(
    phoneNumber: string,
): Promise<{ ok: true; recipient: RecipientAccountDetails } | { ok: false; message: string }> {
    // Simulated latency, so the UI's loading state is exercised in development.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    if (cleaned === '+963980033496' || cleaned === '963911000001') {
        return {
            ok: true,
            recipient: {
                found: true,
                accountNumber: '0000-0708',
                // Already masked, matching what the real lookup returns.
                name: 'R***** B***** T***** Y***** L***** S*****',
                maskedName: 'R***** B***** T***** Y***** L***** S*****',
            },
        };
    }

    return { ok: false, message: 'Account not found. Please verify the phone number.' };
}
