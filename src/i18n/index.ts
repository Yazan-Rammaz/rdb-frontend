import type { TranslationSchema } from './locales/en';
import { en, ar, tr } from './locales';

// ─── Supported Languages ──────────────────────────────────
export type SupportedLanguage = 'en' | 'ar' | 'tr';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

// ─── Translations Map ─────────────────────────────────────
const translations: Record<SupportedLanguage, TranslationSchema> = {
    en,
    ar,
    tr,
};

// ─── Locale Parsing ───────────────────────────────────────

/**
 * Extracts the language code from a locale string.
 * Supports both "country-language" and "language-country"
 * (e.g., "sy-en", "lb-ar", "en-US", "ar-SA").
 * Falls back to 'en' for unknown languages.
 */
export function parseLanguageFromLocale(locale: string): SupportedLanguage {
    if (!locale) return 'ar';
    const normalized = locale.toLowerCase().replace(/_/g, '-');
    const parts = normalized.split('-');
    const first = parts[0] ?? '';
    const second = parts[1] ?? '';

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
 * Type guard for supported languages
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return lang in translations;
}

/**
 * Check if the current language is RTL
 */
export function isRTL(language: SupportedLanguage): boolean {
    return RTL_LANGUAGES.includes(language);
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
