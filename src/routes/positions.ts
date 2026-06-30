import { route } from '../router';
import { send } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { store } from '../store';

route('GET', '/v1/position/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('Positions', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined));
});
route('GET', '/v1/order/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('Orders', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined));
});
