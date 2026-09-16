/**
 * Types for the vendored collector in ./sdk.js (which ships as plain JS).
 * TypeScript resolves this file for `import … from './sdk'`; webpack bundles
 * sdk.js. Keep the two in sync when refreshing the vendored copy.
 */

export interface ObserveOptions {
    /** Collector origin, no trailing slash. */
    url: string;
    /** Publishable ingest key (pk_…). Safe in the bundle — it only writes. */
    key: string;

    /**
     * Console levels to mirror. Default: ['warn', 'error'].
     * `log` is deliberately not included — it would ship every debug line.
     */
    levels?: Array<'log' | 'info' | 'warn' | 'error'>;
    maxBody?: number;
    flushMs?: number;
    maxFlushes?: number;
    correlation?: string;

    /**
     * Pinning either of these makes the matching dashboard toggle a no-op.
     * Leave them undefined unless the app must refuse something regardless.
     */
    captureBodies?: boolean;
    captureHeaders?: boolean;

    /** Requests matching these are not recorded at all. */
    ignorePaths?: RegExp[];
    /** Requests still recorded (method/path/status/duration) but never with a body or headers. */
    denyBodyPaths?: RegExp[];
    /**
     * Like `denyBodyPaths`, but one-directional: the request body and headers
     * are withheld while the response body and headers are still recorded.
     * For endpoints that take a secret and answer with a diagnosis.
     *
     * Local addition — see the `rdb LOCAL PATCH` markers in sdk.js.
     */
    denyRequestBodyPaths?: RegExp[];
}

/** Installs the hooks. Safe to call more than once — later calls are ignored. */
export function observe(options: ObserveOptions): void;

/** Ties this session to an id your backend also logs (e.g. the user id). */
export function setCorrelation(value: string): void;

/** Records a message the user was actually shown on screen. */
export function screenMessage(text: string): void;

/** Free-form breadcrumb on the session timeline. */
export function note(msg: string): void;

/** Redaction helpers, exported for reuse. */
export function scrub(input: string): string;
export function redactPath(input: string): string;
