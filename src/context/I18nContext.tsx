'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { TranslationSchema } from '@/i18n/locales/en';
import {
    SupportedLanguage,
    getTranslations,
    getBrowserLanguage,
    getPersistedLanguage,
    isRTL,
    parseLanguageFromLocale,
    persistLanguage,
} from '@/i18n';

// ─── Context Shape ────────────────────────────────────────

interface I18nContextValue {
    /** Current language code */
    language: SupportedLanguage;
    /** Translation function */
    tr: (key: string, params?: Record<string, any>) => string;
    t: TranslationSchema;
    /** Whether the current language is RTL */
    rtl: boolean;
    /** Direction attribute value: 'rtl' | 'ltr' */
    dir: 'rtl' | 'ltr';
    /** Change the language (only works in standalone mode) */
    setLanguage: (lang: SupportedLanguage) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// ─── Provider Props ───────────────────────────────────────

interface I18nProviderProps {
    children: React.ReactNode;
    /**
     * When used as RDB dependency, pass the `locale` prop (e.g., "sy-en", "lb-ar").
     * The language is extracted from this value and is read-only.
     *
     * When not provided (standalone mode), the language is loaded from
     * persisted localStorage value, falling back to browser locale.
     */
    locale?: string;
}

// ─── Provider Component ──────────────────────────────────

export function I18nProvider({ children, locale }: I18nProviderProps) {
    const isLibraryMode = locale !== undefined;

    // Resolve initial language
    const resolveInitial = (): SupportedLanguage => {
        if (isLibraryMode) {
            return parseLanguageFromLocale(locale);
        }
        return getPersistedLanguage() ?? getBrowserLanguage();
    };

    const [language, setLanguageState] = useState<SupportedLanguage>(resolveInitial);

    // When the locale prop changes (library mode), update language
    useEffect(() => {
        if (isLibraryMode) {
            setLanguageState(parseLanguageFromLocale(locale));
            return;
        }
        setLanguageState(getPersistedLanguage() ?? getBrowserLanguage());
    }, [locale, isLibraryMode]);

    // Public setter – only works in standalone mode
    const setLanguage = useCallback(
        (lang: SupportedLanguage) => {
            if (isLibraryMode) {
                console.warn(
                    '[RDB i18n] Cannot change language in library mode. Update the `locale` prop instead.',
                );
                return;
            }
            setLanguageState(lang);
            persistLanguage(lang);
        },
        [isLibraryMode],
    );

    // Apply dir attribute on <html> element
    // Policy:
    // - 'ar' -> rtl
    // - 'en' -> ltr
    // - 'tr' -> ltr
    // Components should inherit this unless displaying inherently LTR data (e.g. phone numbers).
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const dir = isRTL(language) ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    // Translation function
    const translations = useMemo(() => getTranslations(language), [language]);
    const tr = useCallback(
        (key: string, params?: Record<string, any>) => {
            const keys = key.split('.');
            let result: any = translations;
            for (const k of keys) {
                if (result && typeof result === 'object' && k in result) {
                    result = result[k];
                } else {
                    return key; // fallback to key if not found
                }
            }
            if (typeof result === 'string' && params) {
                return result.replace(/{{(\w+)}}/g, (_, p) => params[p] ?? '');
            }
            return typeof result === 'string' ? result : key;
        },
        [translations],
    );

    const value = useMemo<I18nContextValue>(
        () => ({
            language,
            t: getTranslations(language),
            tr,
            rtl: isRTL(language),
            dir: isRTL(language) ? 'rtl' : 'ltr',
            setLanguage,
        }),
        [language, tr, setLanguage],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────

/**
 * Access translations, language, and direction info.
 *
 * @example
 * const { t, tr, rtl, language, setLanguage } = useTranslation();
 * <p>{t.auth.enterPhone.signInTitle}</p>
 */
export function useTranslation() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error('useTranslation must be used within an <I18nProvider>');
    }
    return ctx;
}
