import { route } from '../router';
import { send } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { nowIso } from '../lib/time';
import { store } from '../store';

route('GET', '/v1/contract/list', async (req, res) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('Contracts')); });
route('GET', '/v1/product/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const c = await store.list('Contracts');
  send(res, 200, c.map((x) => ({ id: x.productId, name: String(x.name).replace(/[A-Z]\d$/, ''), exchange: x.exchange, productType: x.productType, currency: x.currency })));
});
route('GET', '/v1/fee/list', async (req, res, ctx) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('Fees', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined)); });
route('GET', '/v1/alert/list', async (req, res, ctx) => { if (!requireAuth(req, res)) return; send(res, 200, await store.list('Alerts', ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined)); });

const QUOTE_BOARD: Record<string, number> = { ES: 5510.0, NQ: 19840.5, YM: 41280, RTY: 2235.4, MES: 5512.25, MNQ: 19841.0, CL: 71.85, GC: 2418.6, MYM: 41281, M2K: 2235.6 };
route('GET', '/v1/quotes', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const want = (ctx.query.symbols ? String(ctx.query.symbols).split(',') : Object.keys(QUOTE_BOARD)).map((s) => s.trim().toUpperCase()).filter(Boolean);
  const ts = nowIso();
  send(res, 200, { quotes: want.map((sym) => {
    const base = QUOTE_BOARD[sym] != null ? QUOTE_BOARD[sym] : 100 + Math.random() * 100;
    const drift = (Math.random() - 0.5) * base * 0.004;
    const last = Math.round((base + drift) * 100) / 100;
    return { symbol: sym, bid: Math.round((last - 0.25) * 100) / 100, ask: Math.round((last + 0.25) * 100) / 100, last, change: Math.round(drift * 100) / 100, changePct: Math.round((drift / base) * 10000) / 100, timestamp: ts };
  }) });
});
