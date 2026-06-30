import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireCustomer } from '../middleware/auth';
import { isEmail, validAmount } from '../services/validation';
import { ownedAccount, nextAccountId, genPassword } from '../services/accounts';
import { withLock } from '../lib/lock';
import { nowIso, tradeDateToday } from '../lib/time';
import * as token from '../lib/token';
import * as password from '../lib/password';
import { MAX_DEPOSIT, ENV_LABEL } from '../config';
import { store } from '../store';
import type { Row } from '../types';

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
  send(res, 200, { user: safe, accounts: await store.list('Accounts', { userId: user.id }) });
});

route('POST', '/app/account/open', async (req, res, ctx) => {
  const claims = requireCustomer(req, res); if (!claims) return;
  const b = ctx.body || {};
  const user = await store.findOne('OrgUsers', { email: String(claims.email) });
  if (!user) return fail(res, 404, 'User not found.');
  const id = await nextAccountId();
  const acct = await store.insert('Accounts', { id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false, clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: 1, autoLiqProfileId: 2, marginAccountType: 'Speculator', legalStatus: b.legalStatus || 'Individual', archived: false, nickname: b.nickname || `${user.firstName || user.name} — ${b.legalStatus || 'Individual'}`, ownerEmail: user.email, platformPassword: genPassword(), state: 'pending_funding', provisioning: 'provisioned', primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso() });
  await store.insert('CashBalances', { accountId: id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1, cashBalance: 0, realizedPnL: 0, weekRealizedPnL: 0, netLiq: 0, openPnL: 0, totalCashValue: 0, initialMargin: 0, maintenanceMargin: 0, availableForTrading: 0 });
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
  send(res, 200, { ok: true, trade: { symbol: pick.name, side, qty, price: px, realized, openPnL: open }, balance: updated });
});
