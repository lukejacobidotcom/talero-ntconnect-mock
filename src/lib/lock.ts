/**
 * Per-key async mutex: serializes critical sections sharing a key (e.g. an accountId),
 * so concurrent money mutations cannot interleave a read-modify-write. Single-process only;
 * a multi-instance deployment must use a DB transaction / row lock (see the Postgres adapter).
 */
const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string | number, fn: () => Promise<T>): Promise<T> {
  const k = String(key);
  const prev = chains.get(k) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((res) => { release = res; });
  chains.set(k, prev.then(() => next));
  return prev.then(() => fn()).finally(() => {
    release();
    if (chains.get(k) === next) chains.delete(k);
  });
}
