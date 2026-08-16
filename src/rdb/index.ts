'use client';

// 1. Import all actions from the server file

// 2. Export them in a structured way that preserves Server References

export { default as RDB } from './components/RDB';
export type { RDBProps, initialData } from './types/RDBProps';

// 3. Re-export i18n utilities for consumers
export { useTranslation, I18nProvider } from '@/context/I18nContext';
export type { SupportedLanguage } from '@/i18n';
