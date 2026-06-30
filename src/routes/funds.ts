import { route } from '../router';
import { send, fail } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { validAmount } from '../services/validation';
import { nowIso } from '../lib/time';
import { store } from '../store';

route('GET', '/v1/funds/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('Funds', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined));
});
route('POST', '/v1/funds/deposit', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId || validAmount(b.amount) == null) return fail(res, 400, 'accountId and a positive amount are required.');
  send(res, 200, await store.insert('Funds', { accountId: b.accountId, type: 'deposit', method: b.method || 'ACH (Plaid)', amount: Number(b.amount), currency: b.currency || 'USD', status: 'pending', reference: `DEP-${Date.now()}-${b.accountId}`, createdAt: nowIso(), settledAt: null, destinationOfRecord: 'NinjaTrader Clearing, LLC' }));
});
route('POST', '/v1/funds/withdraw', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId || validAmount(b.amount) == null) return fail(res, 400, 'accountId and a positive amount are required.');
  send(res, 200, await store.insert('Funds', { accountId: b.accountId, type: 'withdrawal', method: b.method || 'ACH (return-to-originator)', amount: Number(b.amount), currency: b.currency || 'USD', status: 'pending_review', reference: `WD-${Date.now()}-${b.accountId}`, createdAt: nowIso(), settledAt: null, destinationOfRecord: 'NinjaTrader Clearing, LLC' }));
});
