import { withoutMalformedQuery } from '@/domain/links';

/**
 * Expo Router calls this for every link that opens the app (cold start and while running)
 * before it reads the link. A link whose query is malformed percent-encoding loses its
 * query here, so it never reaches the slow fallback decoder in decode-uri-component 0.2
 * (see docs/SECURITY.md). Any error lets the link through unchanged: this must never
 * be the reason a link fails to open.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return withoutMalformedQuery(path);
  } catch {
    return path;
  }
}
