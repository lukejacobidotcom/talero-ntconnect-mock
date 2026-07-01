import * as crypto from 'crypto';
export function reqId(): string { return crypto.randomUUID(); }
type Level = 'info' | 'warn' | 'error';
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const rec = { level, msg, time: new Date().toISOString(), ...fields };
  const line = JSON.stringify(rec);
  if (level === 'error') console.error(line); else console.log(line);
}
