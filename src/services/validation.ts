export function isEmail(s: unknown): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }
export function validAmount(v: unknown): number | null { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; }
