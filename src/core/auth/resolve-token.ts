/**
 * Universal auth token resolver.
 * Reads the auth token from a cookie by name (server-side only).
 *
 * @param cookieName - The cookie name to read the token from.
 *                     Defaults to the internal 'rdb_at' cookie.
 * @returns The token string or null if not found.
 */

const DEFAULT_AUTH_COOKIE = "rdb_at";

export async function resolveAuthToken(
  cookieName?: string,
): Promise<string | null> {
  const name = cookieName || DEFAULT_AUTH_COOKIE;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value ?? null;
  } catch (e) {
    // Not in a server context — return null
    return null;
  }
}
