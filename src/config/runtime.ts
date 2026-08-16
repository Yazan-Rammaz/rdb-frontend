import { appConfig } from './app';

/**
 * Runtime environment values resolved once at module load.
 *
 * These previously lived in `src/rdb/types/RDBProps.ts` alongside the library's
 * prop types, because a host app could override them when mounting the RDB
 * component. There is no library build any more, so they are plain app config
 * and belong here — the core actions and `core/utils` read them directly.
 */
export const initialData: {
    BaseUrl: string;
    Locale: string;
    CountryCode: string | undefined;
} = {
    // Fall back to the same NestJS origin edgeProxy uses, so an environment that
    // doesn't supply NEXT_PUBLIC_RDB_BASE_URL (it is set in no .env file — only as
    // a wrangler.toml var) still targets a real host. An earlier fallback was a
    // doubled domain that could not resolve, so every server action failed with an
    // opaque network error rather than anything diagnosable.
    BaseUrl: process.env.NEXT_PUBLIC_RDB_BASE_URL ?? appConfig.baseUrl,
    Locale: process.env.NEXT_PUBLIC_RDB_LOCALE ?? 'en-gb',
    CountryCode: undefined,
};
