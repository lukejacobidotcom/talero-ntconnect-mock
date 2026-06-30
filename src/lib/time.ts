export function nowIso(): string { return new Date().toISOString(); }
export function tradeDateToday(): { year: number; month: number; day: number } {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
