import type { TranslationSchema } from './locales/en';
import { en, ar, tr, ckb } from './locales';

// ─── Supported Languages ──────────────────────────────────
/** `ckb` = Central Kurdish (Sorani), Arabic script. */
export type SupportedLanguage = 'en' | 'ar' | 'tr' | 'ckb';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'ckb'];

// ─── Translations Map ─────────────────────────────────────
const translations: Record<SupportedLanguage, TranslationSchema> = {
    en,
    ar,
    tr,
    ckb,
};

// ─── Locale Parsing ───────────────────────────────────────

/**
 * Extracts the language code from a locale string.
 * Supports both "country-language" and "language-country"
 * (e.g., "sy-en", "lb-ar", "en-US", "ar-SA", "iq-ckb").
 * `ku` (as in "ku-Arab-IQ") is read as Sorani — the only Kurdish we ship.
 * Falls back to 'ar' for unknown languages.
 */
export function parseLanguageFromLocale(locale: string): SupportedLanguage {
    if (!locale) return 'ar';
    const normalized = locale.toLowerCase().replace(/_/g, '-');
    const parts = normalized.split('-');
    const [first = '', second = ''] = parts.map((p) => (p === 'ku' ? 'ckb' : p));

    if (isSupportedLanguage(first)) return first;
    if (isSupportedLanguage(second)) return second;
    return 'ar';
}

/**
 * Resolve browser language in standalone mode (no persistence).
 */
export function getBrowserLanguage(): SupportedLanguage {
    if (typeof navigator === 'undefined') return 'ar';
    return parseLanguageFromLocale(navigator.language || 'ar');
}

/**
 * Type guard for supported languages. Own keys only: `in` would also accept
 * `constructor` / `__proto__` from a host `locale` or a tampered localStorage.
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return Object.prototype.hasOwnProperty.call(translations, lang);
}

/**
 * Check if the current language is RTL
 */
export function isRTL(language: SupportedLanguage): boolean {
    return RTL_LANGUAGES.includes(language);
}

/**
 * The language to read backend content in, where the backend only localises
 * into `{ en, ar }`. The RTL languages here are Arabic-script, so a Sorani
 * reader gets Arabic rather than an English fragment inside an RTL screen.
 */
export function contentLanguage(language: SupportedLanguage): 'en' | 'ar' {
    return isRTL(language) ? 'ar' : 'en';
}

/**
 * Get translations for a given language
 */
export function getTranslations(language: SupportedLanguage): TranslationSchema {
    return translations[language] ?? translations.en;
}

// ─── Standalone language persistence disabled ─────────────

/**
 * Persist language preference to localStorage (standalone mode)
 */
const LANG_STORAGE_KEY = 'rdb-language';

export function persistLanguage(language: SupportedLanguage): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
        // localStorage might be unavailable
    }
}

/**
 * Read persisted language from localStorage (standalone mode)
 */
export function getPersistedLanguage(): SupportedLanguage | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(LANG_STORAGE_KEY);
        if (stored && isSupportedLanguage(stored)) return stored;
    } catch {
        // ignore
    }
    return null;
}

// ─── Re-exports ───────────────────────────────────────────
export type { TranslationSchema };
export { translations };
