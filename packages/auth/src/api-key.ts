/**
 * API key helpers for machine-to-machine calls. Isomorphic (Web Crypto, no
 * `node:crypto`), so the core entry still loads in the browser and on the edge.
 * The Nest guard that checks keys lives in '@telamonjs/auth/nest'.
 */

/**
 * A new random API key: 32 bytes as URL-safe base64 (43 characters), after
 * an optional `prefix` (e.g. `'svc_'`, so a leaked key is recognizable).
 * Show it once; store it in an env var, or store `hashApiKey(key)` in the
 * database.
 */
export function generateApiKey(prefix = ''): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const base64 = btoa(String.fromCharCode(...bytes))
  return (
    prefix +
    base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  )
}

/**
 * The hex sha256 of a key — what to store and look up instead of the key
 * itself. Same digest as `createHash('sha256').update(key).digest('hex')`.
 * A random 32-byte key needs no salt or slow hash: there is nothing to
 * brute-force.
 */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(key)
  )
  return Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0')
  ).join('')
}
