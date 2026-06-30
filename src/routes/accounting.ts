import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { nowIso, tradeDateToday } from '../lib/time';
import { nextAccountId, genPassword } from '../services/accounts';
import { store } from '../store';
import type { Row } from '../types';

route('GET', '/v1/account/list', async (req, res) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('Accounts')); });
route('GET', '/v1/account/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const a = await store.getById('Accounts', ctx.query.id);
  a ? send(res, 200, a) : fail(res, 404, 'Account not found.');
});
route('GET', '/v1/account/deps', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const uid = ctx.query.masterid || ctx.query.userId;
  send(res, 200, await store.list('Accounts', uid ? { userId: uid } : undefined));
});

route('POST', '/v1/account/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  let user: Row | null = null;
  if (b.userId) user = await store.getById('OrgUsers', b.userId);
  if (!user && b.ownerEmail) {
    user = await store.findOne('OrgUsers', { email: String(b.ownerEmail) });
    if (!user) user = await store.insert('OrgUsers', {
      name: (b.firstName && b.lastName) ? `${b.firstName}.${b.lastName}`.toLowerCase() : String(b.ownerEmail).split('@')[0],
      email: b.ownerEmail, firstName: b.firstName || '', lastName: b.lastName || '', userStatus: 'Active',
      organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional', timestamp: nowIso(),
    });
  }
  if (!user) return fail(res, 400, 'Provide userId or ownerEmail to own the account.');
  const id = b.id || (await nextAccountId());
  const isSim = b.accountType === 'Simulation';
  const account = await store.insert('Accounts', {
    id, name: b.name || `TAL-${id}`, userId: user.id, accountType: b.accountType || 'Customer',
    active: isSim, clearingHouse: isSim ? 'NinjaTrader (Sim)' : 'NinjaTrader Clearing, LLC',
    riskCategoryId: b.riskCategoryId || 1, autoLiqProfileId: b.autoLiqProfileId || 2,
    marginAccountType: b.marginAccountType || 'Speculator', legalStatus: b.legalStatus || 'Individual',
    archived: false, nickname: b.nickname || `${user.firstName || user.name} — ${b.legalStatus || 'Individual'}`,
    ownerEmail: user.email, platformPassword: genPassword(), state: isSim ? 'active' : 'pending_funding',
    provisioning: 'provisioned', primary: !!b.primary, openedDate: nowIso().slice(0, 10), timestamp: nowIso(),
  });
  const startBal = isSim ? (Number(b.startingBalance) || 150000) : 0;
  await store.insert('CashBalances', {
    accountId: id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1, cashBalance: startBal,
    realizedPnL: 0, weekRealizedPnL: 0, netLiq: startBal, openPnL: 0, totalCashValue: startBal,
    initialMargin: 0, maintenanceMargin: 0, availableForTrading: startBal,
  });
  send(res, 200, account);
});

route('POST', '/v1/account/createbulk', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const items = ((ctx.body || {}).items as Row[]) || [];
  const out: Row[] = [];
  for (const b of items) {
    let user: Row | null = b.userId ? await store.getById('OrgUsers', b.userId) : (b.ownerEmail ? await store.findOne('OrgUsers', { email: String(b.ownerEmail) }) : null);
    if (!user && b.ownerEmail) user = await store.insert('OrgUsers', { name: String(b.ownerEmail).split('@')[0], email: b.ownerEmail, firstName: b.firstName || '', lastName: b.lastName || '', userStatus: 'Active', organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional', timestamp: nowIso() });
    if (!user) continue;
    const id = await nextAccountId();
    out.push(await store.insert('Accounts', { id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false, clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: b.riskCategoryId || 1, autoLiqProfileId: 2, marginAccountType: 'Speculator', legalStatus: b.legalStatus || 'Individual', archived: false, nickname: b.nickname || `${user.name} account`, ownerEmail: user.email, platformPassword: genPassword(), state: 'pending_funding', provisioning: 'provisioned', primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso() }));
  }
  send(res, 200, { created: out.length, accounts: out });
});

route('GET', '/v1/cashBalance/list', async (req, res) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('CashBalances')); });
route('GET', '/v1/cashBalance/getcashbalancesnapshot', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const accountId = ctx.query.accountId;
  if (!accountId) return fail(res, 400, 'accountId is required.');
  const snaps = await store.list('CashBalances', { accountId });
  if (!snaps.length) return fail(res, 404, 'No cash-balance snapshot for that account.');
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  send(res, 200, snaps[0]);
});
