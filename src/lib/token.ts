import * as crypto from 'crypto';
import type { Claims } from '../types';

function resolveSecret(): string {
  if (process.env.TOKEN_SECRET) return process.env.TOKEN_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('TOKEN_SECRET must be set in production');
  return 'talero-ntconnect-mock-dev-secret-change-me';
}
const SECRET = resolveSecret();

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as Buffer).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlJson(obj: unknown): string { return b64url(JSON.stringify(obj)); }
function fromB64url(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function sign(payload: Record<string, unknown>, ttlSeconds = 4800): { token: string; exp: number } {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const claim = b64urlJson(body);
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${claim}`).digest());
  return { token: `${head}.${claim}.${sig}`, exp: body.exp };
}

export function verify(token: string | undefined | null): Claims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, claim, sig] = parts;
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${claim}`).digest());
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let body: Claims;
  try { body = JSON.parse(fromB64url(claim)) as Claims; } catch { return null; }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}
