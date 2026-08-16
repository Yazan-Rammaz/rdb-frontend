import { api } from '..';
import type { RecipientAccountDetails } from '../types/transfers';

/**
 * Resolve an account number to a confirmable recipient.
 *
 * This is a helper, not an endpoint: the HTTP call is
 * `api.transfers.lookupAccount`, and everything here is client-side policy that
 * used to live inside the `validateRecipientAccount` action —
 *
 *   - normalise `12345678` to `1234-5678`, so a user pasting an unformatted
 *     number is not told the account does not exist
 *   - treat `found: false` as an error rather than a successful empty result,
 *     because the caller's next step is "show this name and ask to confirm" and
 *     there is nothing to show
 *   - carry `name` into `maskedName`; the API already returns it pre-masked
 *     ("P***y W."), so no masking happens client-side
 *
 * Kept out of `endpoints/` deliberately. Endpoint modules describe the wire
 * contract and nothing else; the moment they start interpreting results, the
 * layer stops being a faithful description of the backend.
 */
export async function resolveRecipient(
    accountNumber: string,
    options?: { signal?: AbortSignal },
): Promise<{ ok: true; recipient: RecipientAccountDetails } | { ok: false; message: string }> {
    const formatted = accountNumber.includes('-')
        ? accountNumber
        : `${accountNumber.slice(0, 4)}-${accountNumber.slice(4)}`;

    const res = await api.transfers.lookupAccount(formatted, options);

    if (!res.ok) return { ok: false, message: res.error.message };

    if (!res.data.found) {
        return { ok: false, message: 'Account not found. Please verify the account number.' };
    }

    return {
        ok: true,
        recipient: {
            found: true,
            accountNumber: res.data.accountNumber,
            name: res.data.name,
            maskedName: res.data.name,
        },
    };
}
