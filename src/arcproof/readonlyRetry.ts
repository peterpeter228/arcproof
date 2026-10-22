/** Bounded request-local read retry. Never accepts a wallet or broadcast function. */
export interface ReadRetryOptions { signal?: AbortSignal; budgetMs?: number; timeoutMs?: number; delayMs?: number }
function transient(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; name?: unknown; cause?: unknown };
  return value.code === -32014 || value.name === 'TimeoutError' ||
    (value.cause !== error && value.cause !== undefined && transient(value.cause));
}
export function createBlockReader(options: ReadRetryOptions = {}) {
  const deadline = Date.now() + Math.min(15_000, Math.max(0, options.budgetMs ?? 15_000));
  return async function read<T>(request: () => Promise<T | null>): Promise<T | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (options.signal?.aborted || Date.now() >= deadline) return null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(Object.assign(new Error('Read deadline'), { name: 'TimeoutError' })),
            Math.min(options.timeoutMs ?? 4_000, deadline - Date.now()));
          onAbort = () => reject(Object.assign(new Error('Read cancelled'), { name: 'AbortError' }));
          options.signal?.addEventListener('abort', onAbort, { once: true });
        });
        const result = await Promise.race([request(), timeout]);
        // A present contradictory header is returned immediately for strict validation.
        if (result !== null) return options.signal?.aborted ? null : result;
      } catch (error) {
        if (!transient(error)) return null;
      } finally {
        clearTimeout(timer);
        if (onAbort) options.signal?.removeEventListener('abort', onAbort);
      }
      if (attempt < 2 && !options.signal?.aborted && Date.now() < deadline) {
        await new Promise<void>((resolve) => setTimeout(resolve, Math.min(options.delayMs ?? 150, deadline - Date.now())));
      }
    }
    return null;
  };
}
