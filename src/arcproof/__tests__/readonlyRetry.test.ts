import { describe, expect, it, vi } from 'vitest';
import { createBlockReader } from '../readonlyRetry';

describe('request-local bounded block reads', () => {
  it('recovers a temporarily missing block with at most three calls', async () => {
    const read = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue({ hash: 'real' });
    expect(await createBlockReader({ delayMs: 0 })(read)).toEqual({ hash: 'real' });
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('keeps missing headers unverifiable after three attempts', async () => {
    const read = vi.fn().mockResolvedValue(null);
    expect(await createBlockReader({ delayMs: 0 })(read)).toBeNull();
    expect(read).toHaveBeenCalledTimes(3);
  });
  it('does not retry an explicit contradictory header or non-transient error', async () => {
    const read = vi.fn().mockResolvedValue({ hash: 'wrong', number: -1n });
    expect(await createBlockReader()(read)).toEqual({ hash: 'wrong', number: -1n });
    expect(read).toHaveBeenCalledTimes(1);
    const denied = vi.fn().mockRejectedValue({ code: 403 });
    expect(await createBlockReader()(denied)).toBeNull();
    expect(denied).toHaveBeenCalledTimes(1);
  });
  it('retries documented transient -32014 but never retries unknown failures', async () => {
    const read = vi.fn().mockRejectedValueOnce({ code: -32014 }).mockResolvedValue('header');
    expect(await createBlockReader({ delayMs: 0 })(read)).toBe('header');
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('bounds stalled transports and shares a total deadline across reads', async () => {
    const read = vi.fn(() => new Promise<null>(() => {}));
    const bounded = createBlockReader({ timeoutMs: 5, budgetMs: 20, delayMs: 0 });
    expect(await bounded(read)).toBeNull();
    expect(read.mock.calls.length).toBeLessThanOrEqual(3);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const next = vi.fn().mockResolvedValue('later');
    expect(await bounded(next)).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });
  it('cancels in-flight observations without accepting late result', async () => {
    const controller = new AbortController();
    let resolve: (value: string) => void = () => {};
    const read = vi.fn(() => new Promise<string>((r) => { resolve = r; }));
    const result = createBlockReader({ signal: controller.signal })(read);
    controller.abort();
    resolve('late');
    expect(await result).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
