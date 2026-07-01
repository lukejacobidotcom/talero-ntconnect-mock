import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAdmin } from '../middleware/auth';
import { appendEvent, listEvents } from '../lib/audit';
import { nowIso } from '../lib/time';
import { provisionFromApplication } from '../services/accounts';
import { AOP, KYC, LIFECYCLE } from '../services/aop';
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
    pendingApplications: apps.filter((x) => x.lifecycle !== LIFECYCLE.ACTIVE && x.lifecycle !== LIFECYCLE.REJECTED).length,
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

// ---- Account Applications (AOP queue, TAL-39) -------------------------------
// Talero submits applicant data to NinjaTrader Clearing via the AOP API; ops acts on the API's
// approve / reject / documents-required response here. KYC/AML decisions and reasons are owned
// by NTC and recorded internally only — never surfaced to the client.

route('GET', '/admin/applications', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const q = String(ctx.query.q || '').toLowerCase();
  const status = String(ctx.query.status || '');
  let apps = await store.list('CustomerApplications');
  if (status && status !== 'All') apps = apps.filter((x) => x.lifecycle === status);
  if (q) apps = apps.filter((x) => `${x.applicantEmail} ${x.applicantName} ${x.accountIdIssued || ''} ${x.legalStatus}`.toLowerCase().includes(q));
  apps.sort((x, y) => String(y.submittedAt).localeCompare(String(x.submittedAt)));
  send(res, 200, apps);
});

route('GET', '/admin/application', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const app = await store.getById('CustomerApplications', ctx.query.id);
  if (!app) return fail(res, 404, 'Application not found.');
  const account = app.accountIdIssued ? await store.getById('Accounts', app.accountIdIssued) : null;
  const user = await store.findOne('OrgUsers', { email: String(app.applicantEmail) });
  send(res, 200, { application: app, account, user: strip(user) });
});

route('POST', '/admin/application/approve', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const app = await store.getById('CustomerApplications', (ctx.body || {}).id);
  if (!app) return fail(res, 404, 'Application not found.');
  let accountId = (app.accountIdIssued as number | null) || null;
  if (!accountId) { const { acct } = await provisionFromApplication(app); accountId = acct.id as number; }
  const user = await store.findOne('OrgUsers', { email: String(app.applicantEmail) });
  if (user && user.userStatus !== 'Active') await store.update('OrgUsers', user.id, { userStatus: 'Active' });
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.APPROVED, kycStatus: KYC.VERIFIED, lifecycle: LIFECYCLE.AWAITING_FUNDING,
    decisionAt: nowIso(), accountIdIssued: accountId, rejectionReasonInternal: null,
  });
  await appendEvent('application.approve', String(a.user.email), { applicationId: app.id, accountId });
  send(res, 200, updated);
});

route('POST', '/admin/application/reject', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.REJECTED, kycStatus: KYC.ACTION_REQUIRED, lifecycle: LIFECYCLE.REJECTED,
    decisionAt: nowIso(), rejectionReasonInternal: b.reason || 'Compliance',
  });
  // Client is told only "not approved" — the internal reason stays in the audit log.
  await appendEvent('application.reject', String(a.user.email), { applicationId: app.id, reason: b.reason || 'Compliance' });
  send(res, 200, updated);
});

route('POST', '/admin/application/request-docs', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  const docs = Array.isArray(b.documents) && b.documents.length ? b.documents.map(String) : ['Government photo ID', 'Proof of address (< 90 days)'];
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.DOCUMENTS_REQUIRED, kycStatus: KYC.ACTION_REQUIRED, lifecycle: LIFECYCLE.KYC_PENDING,
    documentsRequired: docs, decisionAt: null,
  });
  await appendEvent('application.request_docs', String(a.user.email), { applicationId: app.id, documents: docs });
  send(res, 200, updated);
});

route('POST', '/admin/application/resubmit', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  const app = await store.getById('CustomerApplications', (ctx.body || {}).id);
  if (!app) return fail(res, 404, 'Application not found.');
  const updated = await store.update('CustomerApplications', app.id, {
    status: AOP.UNDER_REVIEW, kycStatus: KYC.PENDING, lifecycle: LIFECYCLE.KYC_PENDING,
    submittedAt: nowIso(), decisionAt: null,
  });
  await appendEvent('application.resubmit', String(a.user.email), { applicationId: app.id });
  send(res, 200, updated);
});

route('GET', '/admin/audit', async (req, res, ctx) => {
  const a = await requireAdmin(req, res); if (!a) return;
  send(res, 200, await listEvents(Number(ctx.query.limit) || 250));
});
