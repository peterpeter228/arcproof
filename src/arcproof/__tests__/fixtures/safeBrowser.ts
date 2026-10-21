/** Deterministic same-origin browser primitives for offline dispatch tests; not real-browser acceptance. */
export function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); }, clear: () => { data.clear(); } };
}
export function memoryLocks() {
  const held = new Set<string>();
  return { request: async <T>(name: string, _options: unknown, callback: (lock: object | null) => Promise<T>): Promise<T> => {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { return await callback({ name }); } finally { held.delete(name); }
  } };
}
