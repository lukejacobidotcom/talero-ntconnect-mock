import * as crypto from 'crypto';

export function hash(pw: string): string {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pw ?? ''), salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + dk.toString('hex');
}

export function verify(pw: string, stored: string | undefined | null): boolean {
  try {
    const parts = String(stored ?? '').split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const dk = crypto.scryptSync(String(pw ?? ''), salt, 64);
    return expected.length === dk.length && crypto.timingSafeEqual(expected, dk);
  } catch { return false; }
}
