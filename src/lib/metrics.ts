const counters: Record<string, number> = {};
export function inc(name: string, by = 1): void { counters[name] = (counters[name] || 0) + by; }
/** Prometheus text exposition. */
export function render(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(counters)) lines.push(`talero_${k} ${v}`);
  lines.push(`talero_uptime_seconds ${Math.floor(process.uptime())}`);
  return lines.join('\n') + '\n';
}
