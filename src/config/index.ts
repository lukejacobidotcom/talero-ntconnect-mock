import * as fs from 'fs';
import * as path from 'path';

/** Project root, resolved from the compiled file location (dist/config -> project root). */
export const ROOT = path.resolve(__dirname, '..', '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const PUBLIC_DIR = path.join(ROOT, 'public');

/** Load .env (zero-dep) before reading config, for local dev. Never overrides real env vars. */
(function loadEnv(): void {
  try {
    const p = path.join(ROOT, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch { /* ignore */ }
})();

export const isProduction = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 8787;
export const ENV_LABEL = process.env.NTC_ENV || 'demo';
export const DATA_BACKEND = (process.env.DATA_BACKEND || 'local').toLowerCase();

/** Partner API secret. Production MUST provide it via env; sandbox default only outside production. */
export const SANDBOX_PARTNER_SECRET = isProduction ? null : 'ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5';

/** Per-transaction deposit ceiling (sandbox guard). */
export const MAX_DEPOSIT = 1_000_000;
