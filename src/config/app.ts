/**
 * ─── App Configuration ───────────────────────────────────────
 * Central config for the entire app.
 * Change values here → rebuild → deploy.
 * ─────────────────────────────────────────────────────────────
 */
export const appConfig = {
    /** Show custom NumericKeypad on touch devices instead of native keyboard */
    useCustomKeypad: true,

    /** Idle timeout before auto-lock (ms). Default 3 minutes */
    idleTimeoutMs: 180_000,

    /** Backend base URL */
    baseUrl: 'https://trydos_wallet_develop.ramaaz.dev',
    wsBaseUrl: 'https://trydos_wallet_develop.ramaaz.dev',

    /** Default locale */
    locale: 'en-gb',
};
