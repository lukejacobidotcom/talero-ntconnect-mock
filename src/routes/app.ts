import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireCustomer } from '../middleware/auth';
import { isEmail, validAmount } from '../services/validation';
import { ownedAccount, issueAccount } from '../services/accounts';
import { withLock } from '../lib/lock';
import { appendEvent } from '../lib/audit';
import { nowIso, tradeDateToday } from '../lib/time';
import * as token from '../lib/token';
import * as password from '../lib/password';
import * as aop from '../services/aop';
import { MAX_DEPOSIT, ENV_LABEL } from '../config';
import { store } from '../store';
import type { Row, Claims } from '../types';

/** Latest application for a customer email (most recently submitted). */
async function latestApplication(email: string): Promise<Row | null> {
  const apps = await store.list('CustomerApplications', { applicantEmail: email });
  if (!apps.length) return null;
  apps.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  return apps[0];
}

/** Shape an application for the customer: strip internal reasons, add journey position. */
function appForClient(app: Row | null): Record<string, unknown> | null {
  if (!app) return null;
  return { application: aop.clientView(app), journey: aop.JOURNEY, journeyIndex: aop.journeyIndex(app) };
}

route('POST', '/app/register', async (_req, res, ctx) => {
  const b = ctx.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  if (!isEmail(email)) return fail(res, 400, 'A valid email is required.');
  if (!b.password || String(b.password).length < 8) return fail(res, 400, 'Password must be at least 8 characters.');
  if (await store.findOne('OrgUsers', { email })) return fail(res, 409, 'An account with that email already exists. Please sign in.');
  const user = await store.insert('OrgUsers', { name: email.split('@')[0], email, firstName: b.firstName || '', lastName: b.lastName || '', userStatus: 'PendingApplication', organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional', passwordHash: password.hash(String(b.password)), timestamp: nowIso() });
  const { token: t, exp } = token.sign({ sub: Number(user.id), name: String(user.name), email: String(user.email), env: ENV_LABEL, scopes: 'app.customer' });
  const safe = { ...user }; delete safe.passwordHash;
  send(res, 200, { sessionToken: t, expiresAt: new Date(exp * 1000).toISOString(), user: safe });
});

route('POST', '/app/login', async (_req, res, ctx) => {
  const b = ctx.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  if (!isEmail(email) || !b.password) return fail(res, 400, 'Email and password are required.');
  const user = await store.findOne('OrgUsers', { email });
  if (!user || !password.verify(String(b.password), user.passwordHash as string)) return fail(res, 401, 'Invalid email or password.');
  const accounts = await store.list('Accounts', { userId: user.id });
  const { token: t, exp } = token.sign({ sub: Number(user.id), name: String(user.name), email: String(user.email), env: ENV_LABEL, scopes: 'app.customer' });
  const safe = { ...user }; delete safe.passwordHash;
  send(res, 200, { sessionToken: t, expiresAt: new Date(exp * 1000).toISOString(), user: safe, accounts });
});

route('GET', '/app/me', async (req, res) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user) return fail(res, 404, 'User not found.');
  const safe = { ...user }; delete safe.passwordHash;
  send(res, 200, {
    user: safe,
    accounts: await store.list('Accounts', { userId: user.id }),
    onboarding: appForClient(await latestApplication(String(user.email))),
  });
});

// ---- Account opening (AOP) --------------------------------------------------
// Talero collects the application and submits it to NinjaTrader Clearing's AOP. NTC owns the
// KYC/AML decision (services/aop simulates it); Talero only relays the outcome. On approval a
// pending-funding account is provisioned; first funding activates it.

route('POST', '/app/application', async (req, res, ctx) => {
  const claims = requireCustomer(req, res) as Claims | null; if (!claims) return;
  const b = ctx.body || {};
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user) return fail(res, 404, 'User not found.');

  const input: aop.AopInput = {
    applicantEmail: String(user.email),
    applicantName: String(b.applicantName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name),
    legalStatus: String(b.legalStatus || 'Individual'),
    country: String(b.country || 'United States'),
    idDocProvided: Boolean(b.idDocProvided),
    addressDocProvided: Boolean(b.addressDocProvided),
    ssnProvided: Boolean(b.ssnProvided),
    w8benProvided: Boolean(b.w8benProvided),
    agreements: (b.agreements && typeof b.agreements === 'object') ? b.agreements as Record<string, boolean> : {},
    eConsent: b.eConsent !== false,
    method: b.method === 'Embedded iframe' ? 'Embedded iframe' : 'NT AOP API',
  };
  const decision = aop.evaluateSubmission(input);

  // One live application per customer: update the existing one, else create.
  const existing = await latestApplication(String(user.email));
  const record: Record<string, unknown> = {
    applicantEmail: input.applicantEmail, applicantName: input.applicantName,
    legalStatus: input.legalStatus, country: input.country,
    status: decision.aopResponse, kycStatus: decision.kycStatus, lifecycle: decision.lifecycle,
    documentsRequired: decision.documentsRequired,
    submittedAt: nowIso(), decisionAt: decision.decisionAt,
    method: input.method, rejectionReasonInternal: decision.rejectionReasonInternal,
    // input echo (booleans only — no raw PII) so documents step can re-evaluate
    idDocProvided: input.idDocProvided, addressDocProvided: input.addressDocProvided,
    ssnProvided: input.ssnProvided, w8benProvided: input.w8benProvided,
    agreements: input.agreements, eConsent: input.eConsent,
  };

  let app: Row;
  const priorAccountId = existing ? existing.accountIdIssued : null;
  if (existing && existing.lifecycle !== aop.LIFECYCLE.ACTIVE) {
    app = (await store.update('CustomerApplications', existing.id, { ...record, accountIdIssued: priorAccountId ?? null })) as Row;
  } else if (!existing) {
    app = await store.insert('CustomerApplications', { ...record, accountIdIssued: null });
  } else {
    // already active — nothing to change
    return send(res, 200, appForClient(existing));
  }

  // Provision the account once, on first approval.
  if (decision.issueAccount && !app.accountIdIssued) {
    const acct = await issueAccount(user, { legalStatus: input.legalStatus, nickname: `${input.applicantName} — ${input.legalStatus}` });
    app = (await store.update('CustomerApplications', app.id, { accountIdIssued: acct.id })) as Row;
  }

  // Reflect application state on the user record.
  const userStatus = (decision.lifecycle === aop.LIFECYCLE.AWAITING_FUNDING || decision.lifecycle === aop.LIFECYCLE.ACTIVE) ? 'Active' : 'PendingApplication';
  if (user.userStatus !== userStatus) await store.update('OrgUsers', user.id, { userStatus });

  await appendEvent('application.submit', String(user.email), { applicationId: app.id, status: app.status, lifecycle: app.lifecycle });
  send(res, 200, appForClient(app));
});

route('GET', '/app/application', async (req, res) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const app = await latestApplication(String(claims.email));
  send(res, 200, appForClient(app) || { application: null, journey: aop.JOURNEY, journeyIndex: -1 });
});

route('POST', '/app/application/documents', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const b = ctx.body || {};
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user) return fail(res, 404, 'User not found.');
  const app = await latestApplication(String(user.email));
  if (!app) return fail(res, 404, 'No application on file. Submit an application first.');
  if (app.lifecycle === aop.LIFECYCLE.ACTIVE || app.status === aop.AOP.REJECTED) return fail(res, 409, 'Application is closed to document updates.');

  // Merge newly uploaded document flags and re-run the NTC decision.
  const merged: aop.AopInput = {
    applicantEmail: String(user.email), applicantName: String(app.applicantName || ''),
    legalStatus: String(app.legalStatus || 'Individual'), country: String(app.country || 'United States'),
    idDocProvided: Boolean(app.idDocProvided) || Boolean(b.idDocProvided),
    addressDocProvided: Boolean(app.addressDocProvided) || Boolean(b.addressDocProvided),
    ssnProvided: Boolean(app.ssnProvided) || Boolean(b.ssnProvided),
    w8benProvided: Boolean(app.w8benProvided) || Boolean(b.w8benProvided),
    agreements: (app.agreements as Record<string, boolean>) || {}, eConsent: app.eConsent !== false,
  };
  const decision = aop.evaluateSubmission(merged);
  let updated = (await store.update('CustomerApplications', app.id, {
    status: decision.aopResponse, kycStatus: decision.kycStatus, lifecycle: decision.lifecycle,
    documentsRequired: decision.documentsRequired, decisionAt: decision.decisionAt,
    idDocProvided: merged.idDocProvided, addressDocProvided: merged.addressDocProvided,
    ssnProvided: merged.ssnProvided, w8benProvided: merged.w8benProvided,
  })) as Row;
  if (decision.issueAccount && !updated.accountIdIssued) {
    const acct = await issueAccount(user, { legalStatus: merged.legalStatus, nickname: `${merged.applicantName} — ${merged.legalStatus}` });
    updated = (await store.update('CustomerApplications', updated.id, { accountIdIssued: acct.id })) as Row;
    if (user.userStatus !== 'Active') await store.update('OrgUsers', user.id, { userStatus: 'Active' });
  }
  await appendEvent('application.documents', String(user.email), { applicationId: app.id, lifecycle: updated.lifecycle });
  send(res, 200, appForClient(updated));
});

route('POST', '/app/account/open', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const b = ctx.body || {};
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user) return fail(res, 404, 'User not found.');
  const acct = await issueAccount(user, { legalStatus: b.legalStatus as string | undefined, nickname: b.nickname as string | undefined });
  send(res, 200, acct);
});

route('GET', '/app/account', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const { acct, error } = await ownedAccount(claims, ctx.query.id);
  if (error || !acct) return fail(res, 404, error || 'Account not found.');
  const snaps = await store.list('CashBalances', { accountId: acct.id });
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  send(res, 200, { account: acct, balance: snaps[0] || null, positions: await store.list('Positions', { accountId: acct.id }), orders: await store.list('Orders', { accountId: acct.id }) });
});

route('POST', '/app/account/deposit', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const b = ctx.body || {};
  const amt = validAmount(b.amount);
  if (amt == null) return fail(res, 400, 'amount must be a positive number.');
  if (amt > MAX_DEPOSIT) return fail(res, 400, 'amount exceeds the per-transaction limit.');
  const { acct, error } = await ownedAccount(claims, b.accountId);
  if (error || !acct) return fail(res, 404, error || 'Account not found.');
  const idemKey = req.headers['idempotency-key'] as string | undefined;
  if (idemKey) {
    const seen = await store.findOne('Idempotency', { key: 'deposit:' + idemKey });
    if (seen) return send(res, 200, seen.result as Record<string, unknown>);
  }
  await withLock(acct.id as number, async () => {
    await store.insert('Funds', { accountId: acct.id, type: 'deposit', method: b.method || 'ACH (Plaid)', amount: amt, currency: 'USD', status: 'settled', reference: `DEP-${Date.now()}-${acct.id}`, createdAt: nowIso(), settledAt: nowIso(), destinationOfRecord: 'NinjaTrader Clearing, LLC' });
    const snaps = await store.list('CashBalances', { accountId: acct.id });
    snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    const snap = snaps[0];
    if (snap) {
      const cash = (Number(snap.cashBalance) || 0) + amt;
      await store.update('CashBalances', snap.id, { cashBalance: cash, totalCashValue: cash, netLiq: cash + (Number(snap.openPnL) || 0), availableForTrading: cash, timestamp: nowIso() });
    }
    if (!acct.active) await store.update('Accounts', acct.id, { active: true, state: 'active' });
  });
  await appendEvent('funds.deposit', String(claims.email), { accountId: acct.id, amount: amt });
  // First funding activates the AOP application (fund -> activate).
  const app = await store.findOne('CustomerApplications', { accountIdIssued: acct.id });
  if (app && app.lifecycle === aop.LIFECYCLE.AWAITING_FUNDING) {
    await store.update('CustomerApplications', app.id, { lifecycle: aop.LIFECYCLE.ACTIVE, fundedAt: nowIso() });
  }
  if (idemKey) await store.insert('Idempotency', { key: 'deposit:' + idemKey, result: { ok: true, deposited: amt }, timestamp: nowIso() });
  send(res, 200, { ok: true, deposited: amt });
});

route('POST', '/app/account/simulate', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const b = ctx.body || {};
  const { acct, error } = await ownedAccount(claims, b.accountId);
  if (error || !acct) return fail(res, 404, error || 'Account not found.');
  const contracts = await store.list('Contracts');
  const pool = contracts.filter((c) => String(c.name).startsWith('M'));
  const list = pool.length ? pool : contracts;
  const pick = list[Math.floor(Math.random() * list.length)];
  const side = Math.random() > 0.5 ? 'Buy' : 'Sell';
  const qty = 1 + Math.floor(Math.random() * 3);
  const px = Math.round((5000 + Math.random() * 15000) * 100) / 100;
  const tickVal = Number(pick.tickValue) || 1.25;
  const realized = Math.round((Math.random() - 0.45) * qty * tickVal * 40 * 100) / 100;
  const open = Math.round((Math.random() - 0.4) * qty * tickVal * 30 * 100) / 100;
  await store.insert('Orders', { accountId: acct.id, contractId: pick.id, symbol: pick.name, action: side, orderType: 'Market', orderQty: qty, price: null, ordStatus: 'Filled', filledQty: qty, avgFillPrice: px, timestamp: nowIso() });
  await store.insert('Positions', { accountId: acct.id, contractId: pick.id, symbol: pick.name, netPos: side === 'Buy' ? qty : -qty, netPrice: px, bought: side === 'Buy' ? qty : 0, boughtValue: side === 'Buy' ? px * qty : 0, sold: side === 'Sell' ? qty : 0, soldValue: side === 'Sell' ? px * qty : 0, prevPos: 0, openPnL: open, timestamp: nowIso() });
  const updated = await withLock(acct.id as number, async () => {
    const snaps = await store.list('CashBalances', { accountId: acct.id });
    snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    let snap: Row | undefined = snaps[0];
    if (!snap) snap = await store.insert('CashBalances', { accountId: acct.id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1, cashBalance: 0, realizedPnL: 0, weekRealizedPnL: 0, netLiq: 0, openPnL: 0, totalCashValue: 0, initialMargin: 0, maintenanceMargin: 0, availableForTrading: 0 });
    const cash = Math.round(((Number(snap.cashBalance) || 0) + realized) * 100) / 100;
    return store.update('CashBalances', snap.id, { cashBalance: cash, totalCashValue: cash, realizedPnL: Math.round(((Number(snap.realizedPnL) || 0) + realized) * 100) / 100, weekRealizedPnL: Math.round(((Number(snap.weekRealizedPnL) || 0) + realized) * 100) / 100, openPnL: open, netLiq: Math.round((cash + open) * 100) / 100, availableForTrading: cash, timestamp: nowIso() });
  });
  await appendEvent('trade.simulate', String(claims.email), { accountId: acct.id, symbol: pick.name, side, qty, realized });
  send(res, 200, { ok: true, trade: { symbol: pick.name, side, qty, price: px, realized, openPnL: open }, balance: updated });
});
