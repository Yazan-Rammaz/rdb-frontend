import { request } from '../client';
import { initialData } from '@/config/runtime';
import type { ApiResult, RequestOptions } from '../types/common';
import type {
    LookupAccountResponse,
    SendTransferBody,
    SendTransferResponse,
    TransferPurposeListResponse,
    VerifyTransferBody,
    VerifyTransferResponse,
} from '../types/transfers';

/** Language code NestJS expects in x-lang — 'en-gb' → 'en'. */
function langCode(): string {
    return (initialData.Locale || 'en-gb').split('-')[0];
}

/**
 * Money movement.
 *
 * `verify` then `send` is a deliberate two-step: the sender confirms a resolved
 * recipient name and amount before anything moves. Never call `send` without
 * showing the user what `verify` returned.
 *
 * ─── Why there are no paths here ────────────────────────────────────────────
 * These are opcode-routed, so the real endpoint is named only in a comment.
 * A `path` string would be a literal in a client module and would ship in the
 * bundle — handing over the opcode-to-endpoint mapping that routing through
 * the gateway exists to withhold. `request()` rejects it at compile time
 * (OpSpec types `path` as `never`) and check-bundle-opacity.mjs would fail the
 * build if one arrived by another route.
 *
 * Comments are stripped by the minifier, so they document freely. The real
 * paths live in `lib/opcodeMap.ts`, which is tree-shaken out of the client
 * build. Path-routed modules (banking, loginHistory, the KYC image endpoints)
 * still declare their paths inline — those names are public either way.
 */
export const transfers = {
    /**
     * Purpose-of-transfer options.
     *
     * `x-lang` is sent because NestJS localises the purpose names from that
     * header, not Accept-Language. It is set per-endpoint rather than globally:
     * adding it to every request would change response text across the app,
     * which is a product decision, not part of this migration.
     *
     * → GET /transfer-purpose?type=ALL (op 'tp')
     */
    purposes: (o?: RequestOptions): Promise<ApiResult<TransferPurposeListResponse>> =>
        request({
            op: 'tp',
            options: {
                ...o,
                headers: { 'x-lang': langCode(), ...o?.headers },
            },
        }),

    /**
     * Resolves an account number to a display name before the sender commits.
     *
     * The number rides the opcode payload; the gateway encodes it into the path
     * (see `tl` in lib/opcodeMap.ts), so a value containing a slash cannot
     * alter the route.
     *
     * → GET /transfers/lookup-account/{accountNumber} (op 'tl')
     */
    lookupAccount: (
        accountNumber: string,
        o?: RequestOptions,
    ): Promise<ApiResult<LookupAccountResponse>> =>
        request({ op: 'tl', body: { accountNumber }, options: o }),

    /** → POST /transfers/verify (op 'tv') */
    verify: (
        body: VerifyTransferBody,
        o?: RequestOptions,
    ): Promise<ApiResult<VerifyTransferResponse>> =>
        request({ op: 'tv', method: 'POST', body, options: o }),

    /**
     * Commits the transfer.
     *
     * `idempotencyKey` must be stable across retries of the same transfer — a
     * retry after a timeout that generates a fresh key charges the user twice.
     *
     * → POST /transfers/send (op 'ts')
     */
    send: (body: SendTransferBody, o?: RequestOptions): Promise<ApiResult<SendTransferResponse>> =>
        request({
            op: 'ts',
            method: 'POST',
            // `note` is normalised to '' rather than omitted, matching what the
            // previous action sent — NestJS has been receiving a string here.
            body: { ...body, note: body.note || '' },
            options: o,
        }),
};
