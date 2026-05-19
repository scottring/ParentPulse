/**
 * Rejects if `promise` does not settle within `ms`.
 *
 * Why this exists: on iPad/iOS Safari, Firestore's IndexedDB-backed
 * persistent cache can hang opening its connection (a known WebKit bug,
 * aggravated by bfcache restore). A cache-routed `getDoc` then neither
 * resolves nor rejects, so any loading gate awaiting it spins forever.
 * Racing every bootstrap read against a timeout guarantees the gate
 * always resolves — fall back / show a retry instead of an infinite
 * spinner. Defense in depth: safe regardless of the exact hang cause.
 */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`Timed out after ${ms}ms${label ? `: ${label}` : ''}`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = '',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  }) as Promise<T>;
}
