import type { IncomingMessage, ServerResponse } from 'http';
import * as token from '../lib/token';
import { fail } from '../lib/http';
import { store } from '../store';
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

export const ADMIN_ROLES = new Set(['OrgAdmin', 'Admin', 'Support']);
/** Requires a signed-in user whose OrgUsers.roles is an admin role. Returns claims + user. */
export async function requireAdmin(req: IncomingMessage, res: ServerResponse): Promise<{ claims: Claims; user: Record<string, unknown> } | null> {
  const claims = bearer(req);
  if (!claims || !claims.email) { fail(res, 401, 'Sign in required.'); return null; }
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user || !ADMIN_ROLES.has(String(user.roles))) { fail(res, 403, 'Admin access required.'); return null; }
  return { claims, user };
}
