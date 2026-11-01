/**
 * The phone number a customer types, and the one canonical form it becomes.
 *
 * Every screen that takes a number — sign-up, sign-in, passcode reset — goes
 * through `PhoneInput`, and every request that carries one goes through
 * `toE164`. Both end at `normalizePhoneDigits`, so one real phone number has
 * exactly one representation on the wire.
 *
 * That last sentence is the whole point. `+963994277533` written as
 * `000963994277533` used to reach the backend as a string it had never seen,
 * which meant a second account on a number that already had one. The client is
 * not where that is ultimately enforced — the uniqueness constraint lives in
 * the database and the send-otp endpoint is unauthenticated — but the client
 * should not be the thing generating the malformed input.
 */

export interface CountryData {
    code: string;
    name: string;
    dialCode: string;
    /** Shortest national number, excluding the dial code. */
    minLocal: number;
    /** Longest national number, excluding the dial code. Also the keypad stop. */
    maxLocal: number;
}

/**
 * `minLocal`/`maxLocal` are a range, not a single length. Several entries were
 * written as one number and were wrong for it: Japan and South Korea have no
 * 11-digit numbers at all, so nothing from either country could ever validate,
 * and Germany's mobiles are usually 10 where the table demanded 11. Germany and
 * Lebanon are two of the larger Syrian-diaspora destinations, so those are
 * customers, not edge cases.
 *
 * Countries with a genuinely fixed length carry the same value twice.
 */
export const COUNTRIES: CountryData[] = [
    { code: 'SY', name: 'Syria', dialCode: '963', minLocal: 8, maxLocal: 9 },
    { code: 'TR', name: 'Turkey', dialCode: '90', minLocal: 10, maxLocal: 10 },
    { code: 'IQ', name: 'Iraq', dialCode: '964', minLocal: 8, maxLocal: 10 },
    { code: 'JO', name: 'Jordan', dialCode: '962', minLocal: 8, maxLocal: 9 },
    { code: 'LB', name: 'Lebanon', dialCode: '961', minLocal: 7, maxLocal: 8 },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '966', minLocal: 9, maxLocal: 9 },
    { code: 'AE', name: 'UAE', dialCode: '971', minLocal: 8, maxLocal: 9 },
    { code: 'EG', name: 'Egypt', dialCode: '20', minLocal: 8, maxLocal: 10 },
    { code: 'US', name: 'United States', dialCode: '1', minLocal: 10, maxLocal: 10 },
    { code: 'GB', name: 'United Kingdom', dialCode: '44', minLocal: 9, maxLocal: 10 },
    { code: 'DE', name: 'Germany', dialCode: '49', minLocal: 10, maxLocal: 11 },
    { code: 'FR', name: 'France', dialCode: '33', minLocal: 9, maxLocal: 9 },
    { code: 'IT', name: 'Italy', dialCode: '39', minLocal: 9, maxLocal: 11 },
    { code: 'ES', name: 'Spain', dialCode: '34', minLocal: 9, maxLocal: 9 },
    { code: 'NL', name: 'Netherlands', dialCode: '31', minLocal: 9, maxLocal: 9 },
    { code: 'SE', name: 'Sweden', dialCode: '46', minLocal: 7, maxLocal: 9 },
    { code: 'KW', name: 'Kuwait', dialCode: '965', minLocal: 8, maxLocal: 8 },
    { code: 'QA', name: 'Qatar', dialCode: '974', minLocal: 8, maxLocal: 8 },
    { code: 'BH', name: 'Bahrain', dialCode: '973', minLocal: 8, maxLocal: 8 },
    { code: 'OM', name: 'Oman', dialCode: '968', minLocal: 8, maxLocal: 8 },
    { code: 'PS', name: 'Palestine', dialCode: '970', minLocal: 8, maxLocal: 9 },
    { code: 'YE', name: 'Yemen', dialCode: '967', minLocal: 7, maxLocal: 9 },
    { code: 'LY', name: 'Libya', dialCode: '218', minLocal: 9, maxLocal: 9 },
    { code: 'SD', name: 'Sudan', dialCode: '249', minLocal: 9, maxLocal: 9 },
    { code: 'TN', name: 'Tunisia', dialCode: '216', minLocal: 8, maxLocal: 8 },
    { code: 'DZ', name: 'Algeria', dialCode: '213', minLocal: 9, maxLocal: 9 },
    { code: 'MA', name: 'Morocco', dialCode: '212', minLocal: 9, maxLocal: 9 },
    { code: 'IN', name: 'India', dialCode: '91', minLocal: 10, maxLocal: 10 },
    { code: 'PK', name: 'Pakistan', dialCode: '92', minLocal: 10, maxLocal: 10 },
    { code: 'BD', name: 'Bangladesh', dialCode: '880', minLocal: 10, maxLocal: 10 },
    { code: 'CN', name: 'China', dialCode: '86', minLocal: 11, maxLocal: 11 },
    { code: 'JP', name: 'Japan', dialCode: '81', minLocal: 9, maxLocal: 10 },
    { code: 'KR', name: 'South Korea', dialCode: '82', minLocal: 9, maxLocal: 10 },
    { code: 'RU', name: 'Russia', dialCode: '7', minLocal: 10, maxLocal: 10 },
    { code: 'BR', name: 'Brazil', dialCode: '55', minLocal: 10, maxLocal: 11 },
    { code: 'MX', name: 'Mexico', dialCode: '52', minLocal: 10, maxLocal: 10 },
    { code: 'CA', name: 'Canada', dialCode: '1', minLocal: 10, maxLocal: 10 },
    { code: 'AU', name: 'Australia', dialCode: '61', minLocal: 9, maxLocal: 9 },
];

/**
 * Longest dial code first, so `963` is tested before any shorter code that
 * could shadow it. Ties fall back to the order in `COUNTRIES` — `1` is both US
 * and Canada, and US is listed first, so a `+1` number shows a US flag.
 *
 * The index tiebreak is written out rather than left to `Array.prototype.sort`
 * being stable. Which of two equal-length codes wins only fails to matter
 * because every colliding pair here happens to share its length rule; if a
 * NANP territory with a different rule is ever added, this comparator is what
 * decides the answer, and it should decide it in the open.
 */
const SORTED_COUNTRIES = COUNTRIES.map((country, index) => ({ country, index }))
    .sort((a, b) => b.country.dialCode.length - a.country.dialCode.length || a.index - b.index)
    .map(({ country }) => country);

/** ITU-T E.164: 15 digits, country code included. */
export const E164_MAX_DIGITS = 15;

/**
 * The country whose customers type their number without a country code often
 * enough to be worth a targeted message. Used only to choose *which* hint to
 * show — never to rewrite what the customer typed.
 */
const HOME_COUNTRY_CODE = 'SY';

/**
 * Digits only, leading zeros gone. The one canonical form: whatever this
 * returns is what gets validated, displayed *and* sent.
 *
 * One rule covers every reported variant, because no E.164 country code begins
 * with `0` — ITU-T E.164 reserves it as the trunk/escape digit. So a leading
 * zero is always either the `00` international prefix written without a `+`, a
 * national trunk prefix carried over by habit, or a typo. `000963…`, `00963…`
 * and `0963…` all collapse to `963…`.
 *
 * The regex is anchored and carries no `g` flag, deliberately. Only a run at
 * position 0 is removed; internal zeros are never touched. Italy is the reason
 * to leave it that way — Italian landlines keep a `0` inside the national
 * number (`+39 06 …`), and `/0+/g` would quietly destroy every one of them.
 */
export function normalizePhoneDigits(raw: string): string {
    return raw.replace(/\D/g, '').replace(/^0+/, '');
}

/** The supported country a normalized number belongs to, or `null`. */
export function findCountry(digits: string): CountryData | null {
    if (!digits) return null;
    return SORTED_COUNTRIES.find((country) => digits.startsWith(country.dialCode)) ?? null;
}

export type PhoneIssue =
    | 'empty'
    /** No country code, but adding the home one would make it a real number. */
    | 'missing-country-code'
    /** A country code we do not serve — or something that is not one at all. */
    | 'unsupported-country'
    | 'wrong-length';

/** Why the number is not one we can send an OTP to, or `null` if it is. */
export function phoneIssue(raw: string): PhoneIssue | null {
    const digits = normalizePhoneDigits(raw);
    if (!digits) return 'empty';

    const country = findCountry(digits);
    if (!country) {
        // A Syrian typing `0994277533` off their SIM sleeve has not entered a
        // wrong country code, they have entered none. Telling them their
        // country is unsupported — in the bank's home market — would be both
        // wrong and the likeliest support call this screen can generate.
        //
        // The test is "short enough to still be a home-country local number",
        // not "is one already": the message has to be right from the first
        // digit that can be judged, not only once the number is complete, or
        // it changes under the customer mid-type.
        const homeLocalMax = COUNTRIES.find((c) => c.code === HOME_COUNTRY_CODE)?.maxLocal ?? 0;
        return digits.length <= homeLocalMax ? 'missing-country-code' : 'unsupported-country';
    }

    return hasValidLength(digits, country) ? null : 'wrong-length';
}

function hasValidLength(digits: string, country: CountryData | null): boolean {
    if (!country) return false;
    const local = digits.length - country.dialCode.length;
    return local >= country.minLocal && local <= country.maxLocal;
}

/**
 * The number as the API takes it. Empty in, empty out — the call sites guard on
 * that, so a future caller that forgets cannot quietly POST an empty string
 * where a phone number belongs.
 */
export function toE164(raw: string): string {
    const digits = normalizePhoneDigits(raw);
    return digits ? `+${digits}` : '';
}
