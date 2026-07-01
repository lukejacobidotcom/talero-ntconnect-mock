import { store } from '../store';
import { nowIso } from '../lib/time';

/** Replay-safe execution: an Idempotency-Key returns the first result instead of re-running. */
export async function withIdempotency<T>(key: string | undefined, scope: string, fn: () => Promise<T>): Promise<{ replayed: boolean; result: T }> {
  if (!key) return { replayed: false, result: await fn() };
  const composite = `${scope}:${key}`;
  const seen = await store.findOne('Idempotency', { key: composite });
  if (seen) return { replayed: true, result: seen.result as T };
  const result = await fn();
  await store.insert('Idempotency', { key: composite, result, timestamp: nowIso() });
  return { replayed: false, result };
}
