'use client';

import React, { useCallback, useContext, useMemo } from 'react';
import { I18nContext } from '@/context/I18nContext';
import messages from './messages.json';

/**
 * The slice of `next-intl` these screens use, on top of rdb's own I18nContext.
 *
 * The KYC screens were ported from the root dashboard, which runs next-intl
 * with ICU messages. rdb has its own typed translation tree, and folding ~45
 * KYC strings into it would mean re-keying every call site in a 24k-line port.
 * So the screens keep calling `useTranslations('auth')`, and this answers from
 * `messages.json` — the exact strings root ships, in en/ar/tr — in whatever
 * language rdb's provider currently says.
 *
 * Supported: `t(key)`, `t(key, { name })` for `{name}` placeholders, and
 * `t.rich(key, { tag: (chunks) => node })` for `<tag>…</tag>`. That is all the
 * ported screens use; nothing here parses plurals or selects.
 */

type Lang = keyof typeof messages;
type Values = Record<string, string | number>;
type RichValues = Record<string, string | number | ((chunks: React.ReactNode) => React.ReactNode)>;

function lookup(lang: Lang, key: string): string {
    const table = messages[lang] as Record<string, string>;
    return table[key] ?? (messages.en as Record<string, string>)[key] ?? key;
}

function interpolate(text: string, values?: Record<string, unknown>): string {
    if (!values) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
        const v = values[name];
        return typeof v === 'string' || typeof v === 'number' ? String(v) : whole;
    });
}

/** `<tag>chunks</tag>` → `values.tag(chunks)`, one level deep (all the copy needs). */
function renderRich(text: string, values: RichValues): React.ReactNode {
    const out: React.ReactNode[] = [];
    const re = /<(\w+)>(.*?)<\/\1>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const fn = values[m[1]];
        out.push(
            <React.Fragment key={i++}>
                {typeof fn === 'function' ? fn(m[2]) : m[2]}
            </React.Fragment>,
        );
        last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

export type Translator = ((key: string, values?: Values) => string) & {
    rich: (key: string, values: RichValues) => React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations(_namespace: 'auth'): Translator {
    // Outside an I18nProvider (a standalone route) this reads null → English.
    const ctx = useContext(I18nContext);
    const raw = ctx?.language ?? 'en';
    const lang: Lang = raw in messages ? (raw as Lang) : 'en';

    const t = useCallback(
        (key: string, values?: Values) => interpolate(lookup(lang, key), values),
        [lang],
    );

    return useMemo(() => {
        const fn = t as Translator;
        fn.rich = (key, values) => renderRich(interpolate(lookup(lang, key), values), values);
        return fn;
    }, [t, lang]);
}
