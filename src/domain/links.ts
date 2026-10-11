/**
 * Incoming links are read by Expo Router, which decodes their query with `query-string`
 * and, through it, `decode-uri-component` 0.2. That package tries the built-in
 * `decodeURIComponent` first and falls back to a slow decoder (exponential time on crafted
 * input, GHSA-vcc3-ghjq-m6fr) only when that throws. Dropping a query that the built-in
 * decoder rejects means the slow path is never reached; the route itself still opens.
 */

/** True when every key and value in the query decodes cleanly, the way query-string reads them. */
function queryDecodes(query: string): boolean {
  for (const part of query.split(/[&=]/)) {
    try {
      decodeURIComponent(part.replace(/\+/g, ' '));
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * The link unchanged, or without its query when any part of the query is malformed
 * percent-encoding ("%E0%A4%A"). A fragment after the query is kept.
 */
export function withoutMalformedQuery(link: string): string {
  const start = link.indexOf('?');
  if (start === -1) return link;
  const hash = link.indexOf('#', start);
  const query = hash === -1 ? link.slice(start + 1) : link.slice(start + 1, hash);
  if (queryDecodes(query)) return link;
  return link.slice(0, start) + (hash === -1 ? '' : link.slice(hash));
}
