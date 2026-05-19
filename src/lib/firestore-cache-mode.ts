/**
 * Chooses the Firestore local-cache strategy.
 *
 * Background: Firestore's IndexedDB-backed `persistentLocalCache` is
 * unreliable on iOS/iPadOS — WebKit's IndexedDB can hang opening its
 * connection (bfcache restore, backgrounding), wedging every read.
 * ALL iOS browsers are WebKit, so the bug is platform-wide, not
 * Safari-specific. `forceOwnership: true` makes it worse (a stale
 * single-tab lease blocks the new tab forever) and was only added to
 * dodge a *dev-only* HMR/StrictMode "ca9" cascade — it buys nothing
 * in production.
 *
 * Strategy:
 *  - dev (any browser): keep persistent + forceOwnership (ca9 dodge).
 *  - prod on iOS/iPadOS: in-memory cache — trade offline persistence
 *    for a reliable app. Reliability wins for the beta.
 *  - prod elsewhere: persistent cache WITHOUT forceOwnership.
 */
export type FirestoreCacheMode =
  | 'persistent-force-ownership'
  | 'persistent'
  | 'memory';

export function isIOS(opts: {
  ua: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  if (/iPad|iPhone|iPod/.test(opts.ua)) return true;
  // iPadOS 13+ reports a macOS UA; the touch-point count is the tell.
  if (
    (opts.platform === 'MacIntel' || /Macintosh/.test(opts.ua)) &&
    opts.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

export function selectFirestoreCacheMode(opts: {
  isDev: boolean;
  isIOS: boolean;
}): FirestoreCacheMode {
  if (opts.isDev) return 'persistent-force-ownership';
  if (opts.isIOS) return 'memory';
  return 'persistent';
}
