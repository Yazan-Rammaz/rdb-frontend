/**
 * Whether the app can reach its own origin — the single source of truth for
 * "offline" across the app.
 *
 * `navigator.onLine === false` is reliable, but `true` only means "some network
 * interface is up": Wi-Fi without internet or a dead mobile link still reports
 * online. So the browser events are one input, and the real requests made by
 * `request()` in `src/api/client.ts` are the other: any response proves the
 * origin answered; a failure is checked with one cheap probe before the app is
 * declared offline.
 *
 * A module store rather than a React context because its main writer, the api
 * client, is not React. Components read it through `useSyncExternalStore`
 * (`src/hooks/useIsOnline.ts`), which re-renders only the components that read
 * it — a provider high in the layout would re-render the whole tree per flip.
 */

type Listener = () => void;

/** A drop that reverses within this window (a network handover) is ignored. */
const OFFLINE_GRACE_MS = 600;
/**
 * A request still pending after this long gets a probe (it is never aborted).
 * STALL_MS + PROBE_TIMEOUT_MS bounds how long lie-fi goes unreported: 10 s.
 */
const STALL_MS = 6_000;
const PROBE_TIMEOUT_MS = 4_000;
const REPROBE_BASE_MS = 2_000;
const REPROBE_MAX_MS = 30_000;
/**
 * Static, same-origin, no auth, not matched by src/middleware.ts and allowed by
 * the CSP's connect-src 'self' — no endpoint had to be added for the probe.
 */
const PROBE_URL = '/manifest.json';

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
const listeners = new Set<Listener>();
let waiters: Array<() => void> = [];
let probeInFlight: Promise<boolean> | null = null;
let graceTimer: ReturnType<typeof setTimeout> | undefined;
let reprobeTimer: ReturnType<typeof setTimeout> | undefined;
let reprobeDelay = REPROBE_BASE_MS;

function setOnline(next: boolean): void {
    if (next === online) return;
    online = next;
    if (next) {
        clearTimeout(reprobeTimer);
        reprobeTimer = undefined;
        reprobeDelay = REPROBE_BASE_MS;
        const resolved = waiters;
        waiters = [];
        resolved.forEach((resolve) => resolve());
    }
    listeners.forEach((listener) => listener());
}

/**
 * While offline on a link the OS still calls "up" (lie-fi), nothing else will
 * tell us the origin is back, so keep probing with backoff. With the device
 * truly offline the `online` event covers it and we do not poll at all.
 */
function scheduleReprobe(): void {
    if (online || reprobeTimer || !navigator.onLine) return;
    reprobeTimer = setTimeout(() => {
        reprobeTimer = undefined;
        void probe();
    }, reprobeDelay);
    reprobeDelay = Math.min(reprobeDelay * 2, REPROBE_MAX_MS);
}

/** Single-flight: concurrent failures share one probe. */
function probe(): Promise<boolean> {
    if (!probeInFlight) {
        probeInFlight = (async () => {
            if (!navigator.onLine) return false;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
            try {
                // Any response, even an error status, means the origin answered.
                await fetch(PROBE_URL, {
                    method: 'HEAD',
                    cache: 'no-store',
                    signal: controller.signal,
                });
                return true;
            } catch {
                return false;
            } finally {
                clearTimeout(timer);
            }
        })()
            .then((ok) => {
                setOnline(ok);
                if (!ok) scheduleReprobe();
                return ok;
            })
            .finally(() => {
                probeInFlight = null;
            });
    }
    return probeInFlight;
}

function handleOffline(): void {
    clearTimeout(graceTimer);
    graceTimer = setTimeout(() => setOnline(false), OFFLINE_GRACE_MS);
}

function handleOnline(): void {
    clearTimeout(graceTimer);
    void probe();
}

export const networkStatus = {
    subscribe(listener: Listener): () => void {
        if (listeners.size === 0) {
            window.addEventListener('offline', handleOffline);
            window.addEventListener('online', handleOnline);
        }
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
                window.removeEventListener('offline', handleOffline);
                window.removeEventListener('online', handleOnline);
            }
        };
    },

    getSnapshot(): boolean {
        return online;
    },

    /** Any HTTP response arrived — 4xx and 5xx included: the origin answered. */
    reportResponse(): void {
        setOnline(true);
    },

    /**
     * A request failed without a response. Resolves once the probe has settled
     * the state, so a caller that awaits it can trust `isOffline()` afterwards.
     */
    async reportFailure(): Promise<void> {
        // Already known offline: nothing to learn, so no caller waits on a probe.
        if (!online) return;
        await probe();
    },

    /**
     * Start a stall watchdog for one request; call the returned function when
     * the request settles. It only probes — the request itself is left alone.
     */
    watch(): () => void {
        const timer = setTimeout(() => void probe(), STALL_MS);
        return () => clearTimeout(timer);
    },

    /** Resolves as soon as the origin is reachable (immediately if it is). */
    waitForOnline(): Promise<void> {
        if (online) return Promise.resolve();
        return new Promise((resolve) => waiters.push(resolve));
    },
};

export const isOffline = (): boolean => !online;
