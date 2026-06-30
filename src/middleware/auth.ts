import type { IncomingMessage, ServerResponse } from 'http';
import * as token from '../lib/token';
import { fail } from '../lib/http';
import type { Claims } from '../types';

export function bearer(req: IncomingMessage): Claims | null {
  const h = (req.headers['authorization'] as string) || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? token.verify(m[1]) : null;
}
export function requireAuth(req: IncomingMessage, res: ServerResponse): Claims | null {
  const claims = bearer(req);
  if (!claims) { fail(res, 401, 'Access token is missing or invalid.'); return null; }
  return claims;
}
export function requireCustomer(req: IncomingMessage, res: ServerResponse): Claims | null {
  const claims = bearer(req);
  if (!claims) { fail(res, 401, 'Sign in required.'); return null; }
  if (!claims.email || !/(^|\s)app\.customer(\s|$)/.test(String(claims.scopes || ''))) {
    fail(res, 403, 'This endpoint requires a customer session.'); return null;
  }
  return claims;
}
