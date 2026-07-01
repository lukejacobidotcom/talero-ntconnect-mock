import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAdmin } from '../middleware/auth';
import { appendEvent, listEvents } from '../lib/audit';
import { store } from '../store';
import type { Row } from '../types';

const strip = (u: Row | null): Row | null => { if (!u) return u; const c = { ...u }; delete c.passwordHash; return c; };

route('GET', '/admin/me', async (req, res) => {
  const a = await requireAdmin(req, res); if (!a) return;
  send(res, 200, { user: strip(a.user), role: a.user.roles });
});

route('GET', '/admin/summary', async (req, res) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const [users, accounts, funds, alerts, apps] = await Promise.all([
    store.list('OrgUsers'), store.list('Accounts'), store.list('Funds'), store.list('Alerts'), store.list('CustomerApplications'),
  ]);
  const active = accounts.filter((x) => x.active).length;
  const deposits = funds.filter((f) => f.type === 'deposit').reduce((s, f) => s + (Number(f.amount) || 0), 0);
  send(res, 200, {
    users: users.length, accounts: accounts.length, activeAccounts: active,
    pendingApplications: apps.filter((x) => x.status !== 'Approved').length,
    openAlerts: alerts.filter((x) => x.status === 'open').length, totalDeposits: Math.round(deposits * 100) / 100,
  });
});

route('GET', '/admin/users', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const q = String(ctx.query.q || '').toLowerCase();
  let users = await store.list('OrgUsers');
  if (q) users = users.filter((u) => `${u.email} ${u.firstName} ${u.lastName} ${u.name}`.toLowerCase().includes(q));
  send(res, 200, users.map(strip));
});

route('GET', '/admin/user', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const user = await store.getById('OrgUsers', ctx.query.id);
  if (!user) return fail(res, 404, 'User not found.');
  const accounts = await store.list('Accounts', { userId: user.id });
  send(res, 200, { user: strip(user), accounts });
});

route('GET', '/admin/accounts', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const q = String(ctx.query.q || '').toLowerCase();
  let accts = await store.list('Accounts');
  if (q) accts = accts.filter((x) => `${x.id} ${x.name} ${x.nickname} ${x.ownerEmail}`.toLowerCase().includes(q));
  send(res, 200, accts);
});

route('GET', '/admin/account', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const acct = await store.getById('Accounts', ctx.query.id);
  if (!acct) return fail(res, 404, 'Account not found.');
  const snaps = await store.list('CashBalances', { accountId: acct.id });
  snaps.sort((x, y) => String(y.timestamp).localeCompare(String(x.timestamp)));
  send(res, 200, {
    account: acct, balance: snaps[0] || null,
    positions: await store.list('Positions', { accountId: acct.id }),
    orders: await store.list('Orders', { accountId: acct.id }),
    funds: await store.list('Funds', { accountId: acct.id }),
    risk: await store.findOne('RiskSettings', { accountId: acct.id }),
  });
});

route('POST', '/admin/account/suspend', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const id = (ctx.body || {}).accountId;
  const acct = await store.update('Accounts', id, { active: false, state: 'suspended' });
  if (!acct) return fail(res, 404, 'Account not found.');
  await appendEvent('account.suspend', String(a.user.email), { accountId: id });
  send(res, 200, acct);
});
route('POST', '/admin/account/reactivate', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const id = (ctx.body || {}).accountId;
  const acct = await store.update('Accounts', id, { active: true, state: 'active' });
  if (!acct) return fail(res, 404, 'Account not found.');
  await appendEvent('account.reactivate', String(a.user.email), { accountId: id });
  send(res, 200, acct);
});

route('POST', '/admin/risk/apply', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const b = ctx.body || {};
  if (!b.accountId) return fail(res, 400, 'accountId is required.');
  const existing = await store.findOne('RiskSettings', { accountId: b.accountId });
  const saved = existing ? await store.update('RiskSettings', existing.id, b) : await store.insert('RiskSettings', { scope: 'account', halted: false, ...b });
  await appendEvent('risk.apply', String(a.user.email), { accountId: b.accountId });
  send(res, 200, saved);
});

route('POST', '/admin/halt', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const b = ctx.body || {};
  const halted = b.halted !== false;
  if (b.scope === 'org' || b.accountId === 'all') {
    const all = await store.list('RiskSettings');
    for (const r of all) await store.update('RiskSettings', r.id, { halted });
    await appendEvent('halt.org', String(a.user.email), { halted });
    return send(res, 200, { scope: 'org', halted, affected: all.length });
  }
  if (!b.accountId) return fail(res, 400, 'accountId or scope=org required.');
  const r = await store.findOne('RiskSettings', { accountId: b.accountId });
  if (!r) return fail(res, 404, 'No risk profile for that account.');
  const saved = await store.update('RiskSettings', r.id, { halted });
  await appendEvent('halt.account', String(a.user.email), { accountId: b.accountId, halted });
  send(res, 200, saved);
});

route('GET', '/admin/audit', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  send(res, 200, await listEvents(Number(ctx.query.limit) || 250));
});
