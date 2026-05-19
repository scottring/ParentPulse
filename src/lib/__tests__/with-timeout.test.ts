import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout, TimeoutError } from '../with-timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('resolves with the value when the promise settles before the timeout', async () => {
    const result = await withTimeout(Promise.resolve('user-data'), 1000, 'fetchUser');
    expect(result).toBe('user-data');
  });

  it('rejects with the original error when the promise rejects before the timeout', async () => {
    const original = new Error('permission-denied');
    await expect(
      withTimeout(Promise.reject(original), 1000, 'fetchUser'),
    ).rejects.toBe(original);
  });

  it('rejects with a TimeoutError when the promise never settles', async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<string>(() => {});

    const raced = withTimeout(neverSettles, 5000, 'fetchUser');
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('includes the label in the TimeoutError message for diagnosis', async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<string>(() => {});

    const raced = withTimeout(neverSettles, 5000, 'fetchUser');
    const assertion = expect(raced).rejects.toThrow(/fetchUser/);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
});
