import { store } from '../store';
import { nowIso } from './time';
import type { Row } from '../types';

/** Append an immutable event to the audit log. Best-effort: never blocks the primary op. */
export async function appendEvent(action: string, actor: string, meta: Record<string, unknown> = {}): Promise<void> {
  try { await store.insert('Events', { action, actor: actor || 'system', meta, timestamp: nowIso() }); }
  catch (e) { console.error(JSON.stringify({ level: 'error', msg: 'audit append failed', action, err: (e as Error).message })); }
}
export async function listEvents(limit = 250): Promise<Row[]> {
  const rows = await store.list('Events');
  rows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return rows.slice(0, limit);
}
