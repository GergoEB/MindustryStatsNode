/** Minimal shape of Bun's `server.requestIP`. */
interface RequestIpServer {
  requestIP(request: Request): { address: string } | null
}

/** `::ffff:1.2.3.4` -> `1.2.3.4`, and drops any `%zone` suffix. */
function normalizeIp(ip: string): string {
  const trimmed = ip.trim().split('%')[0] ?? ''
  return /^::ffff:(\d{1,3}\.){3}\d{1,3}$/i.test(trimmed) ? trimmed.slice(7) : trimmed
}

/** First octet pair of a dotted-quad, or null when it isn't IPv4 at all. */
function ipv4Octets(ip: string): [number, number] | null {
  const parts = ip.split('.')
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null
  return [Number(parts[0]), Number(parts[1])]
}

/** True for loopback (127.0.0.0/8, ::1) — i.e. the SSR fetches this process makes to itself. */
export function isLoopback(ip: string | null): boolean {
  if (!ip) return false
  const addr = normalizeIp(ip)
  const v4 = ipv4Octets(addr)
  if (v4) return v4[0] === 127
  return addr === '::1' || addr === '0:0:0:0:0:0:0:1'
}

/** True for loopback plus RFC1918 / CGNAT / link-local / IPv6 unique-local ranges. */
export function isPrivateAddress(ip: string | null): boolean {
  if (!ip) return false
  const addr = normalizeIp(ip)
  if (isLoopback(addr)) return true

  const v4 = ipv4Octets(addr)
  if (v4) {
    const [a, b] = v4
    return a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31
      || a === 169 && b === 254 || a === 100 && b >= 64 && b <= 127
  }

  // fc00::/7 (unique-local) and fe80::/10 (link-local); the leading hextet is
  // enough to decide both, so there is no need to expand the address.
  const head = parseInt(addr.split(':')[0] || '', 16)
  if (isNaN(head)) return false
  return (head & 0xfe00) === 0xfc00 || (head & 0xffc0) === 0xfe80
}

/** Immediate socket peer address, or null when Bun cannot resolve it. */
export function peerAddress(request: Request, server: RequestIpServer | null): string | null {
  const address = server?.requestIP(request)?.address
  return address ? normalizeIp(address) : null
}

/**
 * The client IP a rate-limit bucket should be keyed on.
 *
 * X-Forwarded-For is only consulted when the immediate peer is private — i.e. a local
 * reverse proxy terminating TLS — because a public client can forge the header freely.
 * Within it, the rightmost non-private entry is the last hop we did not add ourselves;
 * anything further left is attacker-controlled.
 */
export function clientIp(request: Request, server: RequestIpServer | null): string {
  const peer = peerAddress(request, server)
  if (!isPrivateAddress(peer)) return peer ?? 'unknown'

  const entries = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map(normalizeIp)
    .filter(Boolean)

  return entries.findLast((entry) => !isPrivateAddress(entry)) ?? entries[0] ?? peer ?? 'unknown'
}
