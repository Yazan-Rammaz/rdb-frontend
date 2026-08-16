import { RDBActions } from '@/core/types/actions';
import { appConfig } from '@/config/app';

/**
 * Cookie keys configuration for reading values from host app cookies
 */
export interface CookiesKeys {
    // Cookie name for the auth token
    authToken?: string;
    // Cookie name for the locale/language
    local?: string;
    // Cookie name for the base URL
    baseUrl?: string;
}

/**
 * Props for the RDB Component.
 * These props allow the host application to configure the library
 * and provide the necessary Server Actions.
 */
export interface RDBProps {
    // The collection of API methods (Server Actions)
    actions?: RDBActions;

    /**
     * The name of the cookie that holds the auth token.
     * In standalone mode, defaults to the internal 'rdb_at'.
     * In package/library mode, pass the host app's cookie name (e.g. 'my_app_token').
     */
    authCookieName?: string;

    // Callback when the library UI should be closed
    onClose?: () => void;

    // Cookie names to read configuration from host app cookies
    cookiesKeys?: CookiesKeys;

    // Callback triggered when the library generates/receives a new token
    onReceivedAuthToken?: (token?: string) => void;

    // Logic to execute when a 401 Unauthorized error occurs
    handleUnauthenticated: () => void;

    // Key for local storage persistence
    storeKey?: string;

    /**
     * Base URL for the WebSocket server (e.g. 'https://api.your-domain.com').
     * In standalone mode, falls back to NEXT_PUBLIC_WS_URL env var.
     * In library mode, pass the host app's WebSocket server URL.
     */
    wsBaseUrl?: string;
}

export const initialData: any = {
    // Fall back to the same NestJS origin edgeProxy uses, so an environment that
    // doesn't supply NEXT_PUBLIC_RDB_BASE_URL (it is set in no .env file — only as
    // a wrangler.toml var) still targets a real host. The previous fallback was
    // `rdb-kyc-worker.yazan-adnof.workers.dev.yazan-adnof.workers.dev/api` — a
    // doubled domain that cannot resolve, so every server action would fail with
    // an opaque network error instead of anything diagnosable.
    BaseUrl: process.env.NEXT_PUBLIC_RDB_BASE_URL ?? appConfig.baseUrl,
    Locale: process.env.NEXT_PUBLIC_RDB_LOCALE ?? 'en-gb',
    CountryCode: undefined as string | undefined,
};
