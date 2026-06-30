import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { nowIso } from '../lib/time';
import { store } from '../store';
import type { Row } from '../types';

route('GET', '/v1/user/list', async (req, res) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('OrgUsers')); });
route('GET', '/v1/user/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const u = await store.getById('OrgUsers', ctx.query.id);
  u ? send(res, 200, u) : fail(res, 404, 'User not found.');
});
route('POST', '/v1/user/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.email) return fail(res, 400, 'email is required.');
  const existing = await store.findOne('OrgUsers', { email: String(b.email) });
  if (existing) return send(res, 200, existing);
  const user = await store.insert('OrgUsers', { name: b.name || String(b.email).split('@')[0], email: b.email, firstName: b.firstName || '', lastName: b.lastName || '', userStatus: b.userStatus || 'Active', organizationId: 5012, roles: b.roles || 'Trader', professionalStatus: b.professionalStatus || 'NonProfessional', timestamp: nowIso() });
  send(res, 200, user);
});
route('POST', '/v1/user/createbulk', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const items = ((ctx.body || {}).items as Row[]) || [];
  const out: Row[] = [];
  for (const b of items) {
    if (!b.email) continue;
    let u = await store.findOne('OrgUsers', { email: String(b.email) });
    if (!u) u = await store.insert('OrgUsers', { name: b.name || String(b.email).split('@')[0], email: b.email, firstName: b.firstName || '', lastName: b.lastName || '', userStatus: 'Active', organizationId: 5012, roles: b.roles || 'Trader', professionalStatus: 'NonProfessional', timestamp: nowIso() });
    out.push(u);
  }
  send(res, 200, { created: out.length, users: out });
});
