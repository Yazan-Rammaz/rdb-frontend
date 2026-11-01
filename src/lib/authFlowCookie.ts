/**
 * Persists auth-flow progress (step + non-sensitive state) in an AES-GCM
 * encrypted client-side cookie so a page refresh resumes the correct step.
 *
 * The data stored here is not secret (step name, phone, authType), but we
 * encrypt it to prevent casual tampering.
 */

const COOKIE_NAME = 'rdb_af';
const COOKIE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthFlowState {
    step: string;
    phone?: string;
    authType?: 'signIn' | 'signUp';
    method?: 'sms' | 'whatsapp';
    sessionInfo?: string;
}

// Derive a fixed 256-bit AES key from a static app-level passphrase.
// The data is not sensitive; this prevents trivial cookie manipulation.
async function getKey(): Promise<CryptoKey> {
    const raw = new TextEncoder().encode('rdb-auth-flow-v1-key-pad-32bytes');
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
    ]);
}

async function encrypt(payload: string): Promise<string> {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(payload),
    );
    const combined = new Uint8Array(iv.byteLength + enc.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(enc), iv.byteLength);
    return btoa(String.fromCharCode(...combined));
}

async function decrypt(b64: string): Promise<string | null> {
    try {
        const key = await getKey();
        const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new TextDecoder().decode(dec);
    } catch {
        return null;
    }
}

// Module-level cache so the cookie is decrypted once. Populated by
// preloadAuthFlowState() (called early during the splash window). AuthPage
// reads it synchronously via getCachedAuthFlowState() to render the correct
// step on first paint — no get-started flash.
//   undefined = not yet loaded
//   null      = loaded, no saved state
let _cache: AuthFlowState | null | undefined = undefined;
let _preloadPromise: Promise<AuthFlowState | null> | null = null;

export async function saveAuthFlowState(state: AuthFlowState): Promise<void> {
    if (typeof document === 'undefined') return;
    const ciphertext = await encrypt(JSON.stringify(state));
    const expires = new Date(Date.now() + COOKIE_TTL_MS).toUTCString();
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ciphertext)}; expires=${expires}; path=/; SameSite=Strict`;
    _cache = state;
}

export async function loadAuthFlowState(): Promise<AuthFlowState | null> {
    if (_cache !== undefined) return _cache;
    if (typeof document === 'undefined') return null;
    const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) {
        _cache = null;
        return null;
    }
    const b64 = decodeURIComponent(match.split('=').slice(1).join('='));
    const json = await decrypt(b64);
    if (!json) {
        _cache = null;
        return null;
    }
    try {
        _cache = JSON.parse(json) as AuthFlowState;
        return _cache;
    } catch {
        _cache = null;
        return null;
    }
}

/**
 * Returns the cached state synchronously. `undefined` means the cookie hasn't
 * been decrypted yet (caller should fall back to async loadAuthFlowState()).
 */
export function getCachedAuthFlowState(): AuthFlowState | null | undefined {
    return _cache;
}

/**
 * Kick off cookie decryption early (e.g. during the splash) so that by the
 * time AuthPage mounts, the result is already cached and can be read
 * synchronously. Idempotent.
 */
export function preloadAuthFlowState(): Promise<AuthFlowState | null> {
    if (_preloadPromise) return _preloadPromise;
    _preloadPromise = loadAuthFlowState();
    return _preloadPromise;
}

export function clearAuthFlowState(): void {
    _cache = null;
    if (typeof document === 'undefined') return;
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}
