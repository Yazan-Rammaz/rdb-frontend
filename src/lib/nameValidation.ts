/**
 * Validation for the customer's own name — the sign-up "Enter Your Name !"
 * screen and the profile's Client Name screen, which both PATCH the same
 * `firstName`/`lastName` pair to `/users/me`.
 *
 * This is a data-quality control, not a security one. The server takes the
 * PATCH from anywhere, so anything rejected here can still be sent by hand;
 * what this stops is a real customer registering as `)(//)}{==>><<""/**--##@#`.
 */

/** UI cap. The server is authoritative on the real limit. */
export const NAME_MAX_LENGTH = 50;

/** Below this the value is not a name yet — see `countRealLetters`. */
const MIN_REAL_LETTERS = 2;

/**
 * Letters in any script, so Arabic and Turkish names are not second-class:
 * `أحمد علي`, `Şükrü Öztürk`, `José María` all pass. Marks are bounded to two
 * per base letter — enough for Arabic harakat and stacked accents, not enough
 * for a "Zalgo" string that paints over neighbouring rows.
 *
 * Parts join with a single space, hyphen or apostrophe (`Anne-Marie`,
 * `O'Brien`; `’` because iOS substitutes it). Any number of parts — Arabic
 * legal names are routinely three or four.
 *
 * Category Cf is deliberately in neither class, which is what rejects the
 * RTL/LTR overrides (U+202E) and the zero-width joiners. Do not "relax" this
 * without knowing that.
 *
 * The hyphen is escaped because it is literal only by virtue of being last:
 * reordered to `[ -'’]` it would silently become the range `!"#$%&'`.
 */
const NAME_RE = /^(?:\p{L}\p{M}{0,2})+(?:[ '’\-](?:\p{L}\p{M}{0,2})+)*$/u;

/** A separator the user has typed but not yet followed with a letter. */
const TRAILING_SEPARATOR_RE = /[ '’-]+$/u;

/**
 * Letters that carry no identity: modifier letters (`\p{Lm}` — tatweel `ـ`,
 * the modifier apostrophe `ʼ`) and the Hangul fillers, which are category
 * `Lo` and render as nothing at all. Without this, `ㅤㅤ` is an invisible
 * two-character "name" that satisfies every other rule.
 */
const DECORATIVE_LETTER_RE = /[\p{Lm}ᅟᅠㅤﾠ]/u;

export type NameIssue = 'empty' | 'invalid-chars' | 'too-long' | 'too-short';

/**
 * The one canonical form: NFC first, so a pasted decomposed `Şükrü` is five
 * characters rather than eight and cannot be cut between a letter and its
 * marks; then trim and collapse whitespace runs. `\s` rather than a literal
 * space so a non-breaking space pasted from a document normalises away
 * instead of failing with nothing visibly wrong.
 *
 * Whatever this returns is what gets validated *and* what gets sent.
 */
export function normalizeName(raw: string): string {
    return raw.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function countRealLetters(value: string): number {
    const letters = value.match(/\p{L}/gu) ?? [];
    return letters.filter((c) => !DECORATIVE_LETTER_RE.test(c)).length;
}

/** Why the value is not an acceptable name, or `null` if it is. */
export function nameIssue(raw: string): NameIssue | null {
    const value = normalizeName(raw);
    if (!value) return 'empty';
    if (!NAME_RE.test(value)) return 'invalid-chars';
    if (value.length > NAME_MAX_LENGTH) return 'too-long';
    if (countRealLetters(value) < MIN_REAL_LETTERS) return 'too-short';
    return null;
}

/**
 * The issue worth showing while the user is still typing — only input that can
 * never become a name. A half-typed `Anne-` or a single `O` is the user
 * mid-word, not a mistake, so length is left to `nameIssue` at submit.
 */
export function nameIssueWhileTyping(raw: string): NameIssue | null {
    const probe = normalizeName(raw).replace(TRAILING_SEPARATOR_RE, '');
    if (!probe) return null;
    return NAME_RE.test(probe) ? null : 'invalid-chars';
}
