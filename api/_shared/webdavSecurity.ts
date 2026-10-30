/**
 * Shared WebDAV proxy security helpers.
 *
 * Both `api/webdav/proxy.ts` (Vercel function) and the local Express mirror in
 * `server.ts` funnel through this module so the SSRF guard only has to be
 * maintained in one place.
 *
 * IMPORTANT: never import `node:dns` at module scope. Doing so has crashed the
 * Vercel Node sandbox during cold start, which is why the proxy used to carry a
 * private inline copy of these helpers. The DNS lookup below is therefore
 * performed through a dynamic import that is allowed to fail harmlessly.
 */

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/** Reserved / internal suffixes that must never be resolved through the proxy. */
const FORBIDDEN_SUFFIXES = ['.localhost', '.local', '.internal'];

type CidrV4 = { base: number; prefix: number };

/**
 * IPv4 ranges that must never be reachable from the proxy (SSRF guard).
 * Values are unsigned 32-bit integers held in a number, so the comparison below
 * masks both sides instead of relying on signed arithmetic.
 */
const FORBIDDEN_V4: CidrV4[] = [
  { base: 0x00000000, prefix: 8 }, // 0.0.0.0/8       "this network"
  { base: 0x0a000000, prefix: 8 }, // 10.0.0.0/8      private
  { base: 0x64400000, prefix: 10 }, // 100.64.0.0/10  CGNAT
  { base: 0x7f000000, prefix: 8 }, // 127.0.0.0/8     loopback
  { base: 0xa9fe0000, prefix: 16 }, // 169.254.0.0/16 link-local
  { base: 0xac100000, prefix: 12 }, // 172.16.0.0/12  private
  { base: 0xc0000000, prefix: 24 }, // 192.0.0.0/24   IETF protocol assignments
  { base: 0xc0000200, prefix: 24 }, // 192.0.2.0/24   TEST-NET-1
  { base: 0xc0586300, prefix: 24 }, // 192.88.99.0/24 6to4 relay anycast
  { base: 0xc0a80000, prefix: 16 }, // 192.168.0.0/16 private
  { base: 0xc6120000, prefix: 15 }, // 198.18.0.0/15  benchmarking
  { base: 0xc6336400, prefix: 24 }, // 198.51.100.0/24 TEST-NET-2
  { base: 0xcb007100, prefix: 24 }, // 203.0.113.0/24 TEST-NET-3
  { base: 0xe0000000, prefix: 4 }, // 224.0.0.0/4     multicast
  { base: 0xf0000000, prefix: 4 }, // 240.0.0.0/4     reserved + broadcast
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function intToIpv4(value: number): string {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

function isForbiddenV4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return false;

  return FORBIDDEN_V4.some(({ base, prefix }) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) === (base & mask);
  });
}

/** Expands a normalised, bracket-free IPv6 literal into eight 16-bit groups. */
function expandIpv6(ip: string): number[] | null {
  if (!ip.includes(':')) return null;

  // A trailing dotted quad ("::ffff:127.0.0.1") stands in for two groups and
  // must be rewritten before the address can be split on colons.
  let normalized = ip;
  const lastColon = normalized.lastIndexOf(':');
  const dottedTail = normalized.slice(lastColon + 1);
  if (dottedTail.includes('.')) {
    const embedded = ipv4ToInt(dottedTail);
    if (embedded === null) return null;
    const high = ((embedded >>> 16) & 0xffff).toString(16);
    const low = (embedded & 0xffff).toString(16);
    normalized = `${normalized.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const sections = normalized.split('::');
  if (sections.length > 2) return null;

  const parseGroups = (segment: string): number[] | null => {
    if (segment === '') return [];
    const groups: number[] = [];
    for (const group of segment.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
      groups.push(parseInt(group, 16));
    }
    return groups;
  };

  const [headSegment = '', tailSegment] = sections;

  if (tailSegment === undefined) {
    const groups = parseGroups(headSegment);
    return groups && groups.length === 8 ? groups : null;
  }

  const head = parseGroups(headSegment);
  const tail = parseGroups(tailSegment);
  if (!head || !tail) return null;

  const gap = 8 - head.length - tail.length;
  if (gap < 0) return null;

  return [...head, ...new Array<number>(gap).fill(0), ...tail];
}

/** IPv4 addresses embedded in `::ffff:0:0/96` (mapped) and `64:ff9b::/96` (NAT64). */
function embeddedIpv4(groups: number[], prefix: number[]): string | null {
  const matchesPrefix = prefix.every((value, index) => groups[index] === value);
  if (!matchesPrefix) return null;
  return intToIpv4(((groups[6] << 16) | groups[7]) >>> 0);
}

function isForbiddenV6(ip: string): boolean {
  const groups = expandIpv6(ip);
  if (!groups) return false;

  const mapped = embeddedIpv4(groups, [0, 0, 0, 0, 0, 0xffff]);
  if (mapped) return isForbiddenV4(mapped);

  const nat64 = embeddedIpv4(groups, [0x64, 0xff9b, 0, 0, 0, 0]);
  if (nat64) return isForbiddenV4(nat64);

  // ::/128 unspecified and ::1/128 loopback.
  if (groups.every((group) => group === 0)) return true;
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) return true;

  if ((groups[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((groups[0] & 0xfe00) === 0xfc00) return true; // fc00::/7  unique local
  if ((groups[0] & 0xff00) === 0xff00) return true; // ff00::/8  multicast

  return false;
}

/**
 * Returns true when `host` points at the local machine, a private network, or
 * another address the proxy must not be able to reach.
 *
 * The WHATWG URL parser keeps the surrounding brackets on IPv6 hostnames
 * (`new URL('http://[::1]/').hostname === '[::1]'`), so they are stripped here.
 * Skipping that step silently let every IPv6 literal bypass the guard.
 */
export function isForbiddenHost(host: string): boolean {
  if (!host) return true;

  let normalized = host.trim().toLowerCase();

  const isIpv6Literal = normalized.startsWith('[') && normalized.endsWith(']');
  if (isIpv6Literal) normalized = normalized.slice(1, -1);

  // A trailing dot is a legal FQDN form ("localhost." must still be caught).
  normalized = normalized.replace(/\.+$/, '');
  if (!normalized) return true;

  if (FORBIDDEN_HOSTNAMES.has(normalized)) return true;
  if (FORBIDDEN_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true;

  // The URL parser always normalises IPv4 literals to a dotted quad.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return isForbiddenV4(normalized);

  if (isIpv6Literal || normalized.includes(':')) return isForbiddenV6(normalized);

  return false;
}

export function validateWebDavUrl(url: string): URL | { error: string } {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { error: 'Invalid URL format' };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { error: 'Unsupported protocol' };
  }

  if (parsedUrl.protocol === 'http:' && process.env.NODE_ENV !== 'development') {
    return { error: 'HTTPS is required for WebDAV connections' };
  }

  if (isForbiddenHost(parsedUrl.hostname)) {
    return { error: 'Access to the requested host is forbidden' };
  }

  return parsedUrl;
}

export function validateWebDavMethod(method: string): string | { error: string } {
  const allowedMethods = ['GET', 'PUT', 'PROPFIND', 'DELETE', 'MKCOL', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(method.toUpperCase())) {
    return { error: 'Method not allowed' };
  }
  return method.toUpperCase();
}

export function validateWebDavBodySize(method: string, bodyString: string): { error: string } | null {
  if (['PUT'].includes(method)) {
    if (bodyString.length > 10 * 1024 * 1024) {
      return { error: 'Request body exceeds size limit' };
    }
  } else if (['PROPFIND'].includes(method)) {
    if (bodyString.length > 256 * 1024) {
      return { error: 'PROPFIND request body exceeds size limit' };
    }
  }
  return null;
}

/**
 * Best-effort DNS guard against rebinding to an internal address.
 *
 * `fetch` performs its own resolution afterwards, so this narrows the rebinding
 * window but cannot fully close it — pinning the resolved IP would be required
 * for that. Any lookup/import failure is treated as "no additional signal" and
 * allowed through, so this check can only ever add protection, never break a
 * host that the static blocklist already accepted.
 */
export async function resolveAndValidateHostname(hostname: string): Promise<{ error: string } | null> {
  const bare = hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  if (!bare) return { error: 'Access to the requested host is forbidden' };

  // Literals were already fully validated by `isForbiddenHost`.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare) || bare.includes(':')) return null;

  try {
    const { lookup } = await import('node:dns/promises');
    const results = await lookup(bare, { all: true });

    for (const { address } of results) {
      if (isForbiddenHost(address)) {
        return { error: 'Access to the requested host is forbidden' };
      }
    }
    return null;
  } catch {
    return null;
  }
}
