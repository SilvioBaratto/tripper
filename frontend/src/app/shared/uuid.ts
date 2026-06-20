/**
 * Generate a RFC-4122-ish v4 UUID that also works in *insecure* browsing
 * contexts (plain http on a LAN / Tailscale IP), where `crypto.randomUUID`
 * is undefined. `crypto.getRandomValues` IS available in insecure contexts,
 * so we use it as the primary fallback; a non-crypto fallback covers the rest.
 *
 * These ids are only used as client-side keys (chat messages, toasts), so the
 * fallback's weaker randomness is fine — it just needs to be unique per session.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
