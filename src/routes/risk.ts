import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { store } from '../store';

route('GET', '/v1/risk/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('RiskSettings', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined));
});
route('POST', '/v1/risk/apply', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId) return fail(res, 400, 'accountId is required.');
  const existing = await store.findOne('RiskSettings', { accountId: b.accountId });
  if (existing) send(res, 200, await store.update('RiskSettings', existing.id, b));
  else send(res, 200, await store.insert('RiskSettings', { scope: 'account', halted: false, ...b }));
});
route('POST', '/v1/risk/halt', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  const halted = b.halted !== false;
  if (b.scope === 'org' || b.accountId === 'all') {
    const all = await store.list('RiskSettings');
    for (const r of all) await store.update('RiskSettings', r.id, { halted });
    return send(res, 200, { scope: 'org', halted, affected: all.length });
  }
  if (!b.accountId) return fail(res, 400, 'accountId or scope=org required.');
  const r = await store.findOne('RiskSettings', { accountId: b.accountId });
  if (!r) return fail(res, 404, 'No risk profile for that account.');
  send(res, 200, await store.update('RiskSettings', r.id, { halted }));
});
