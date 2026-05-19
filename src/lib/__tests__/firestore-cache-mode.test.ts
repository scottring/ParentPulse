import { describe, it, expect } from 'vitest';
import { isIOS, selectFirestoreCacheMode } from '../firestore-cache-mode';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPADOS_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const MAC_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

describe('isIOS', () => {
  it('detects an iPhone', () => {
    expect(isIOS({ ua: IPHONE, platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
  });

  it('detects an iPad even when iPadOS masquerades as macOS', () => {
    expect(
      isIOS({ ua: IPADOS_AS_MAC, platform: 'MacIntel', maxTouchPoints: 5 }),
    ).toBe(true);
  });

  it('does not flag a real Mac desktop (no touch)', () => {
    expect(
      isIOS({ ua: MAC_DESKTOP, platform: 'MacIntel', maxTouchPoints: 0 }),
    ).toBe(false);
  });

  it('does not flag Android', () => {
    expect(isIOS({ ua: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(
      false,
    );
  });
});

describe('selectFirestoreCacheMode', () => {
  it('keeps single-tab forceOwnership in dev (dodges the ca9 HMR cascade)', () => {
    expect(selectFirestoreCacheMode({ isDev: true, isIOS: false })).toBe(
      'persistent-force-ownership',
    );
    expect(selectFirestoreCacheMode({ isDev: true, isIOS: true })).toBe(
      'persistent-force-ownership',
    );
  });

  it('uses memory cache on iOS in production (flaky IndexedDB wedges the app)', () => {
    expect(selectFirestoreCacheMode({ isDev: false, isIOS: true })).toBe('memory');
  });

  it('keeps offline persistence (no forceOwnership) on other production browsers', () => {
    expect(selectFirestoreCacheMode({ isDev: false, isIOS: false })).toBe(
      'persistent',
    );
  });
});
