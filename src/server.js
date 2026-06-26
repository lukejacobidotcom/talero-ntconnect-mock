'use strict';
/*
 * Talero — NT Connect (Tradovate-based) mock API.
 * Zero npm dependencies: Node built-in http + crypto + fs only.
 *
 * Clones the NT Connect /v1 partner contract (the Tradovate engine NT Connect runs on)
 * so the Talero frontend + back-office can be developed and demoed before live partner
 * credentials are issued. Datastore = Google Sheets (DATA_BACKEND=sheets) or local JSON.
 *
 * THIS IS A SANDBOX. Not affiliated with NinjaTrader. Do not present as production.
 */

// Minimal .env loader (zero-dep). Must run BEFORE requiring modules that read process.env.
(function loadEnv() {
  try {
    const fs = require('fs'), path = require('path');
    const p = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch (e) { /* ignore */ }
})();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { store } = require('./lib/store');
const token = require('./lib/token');

const PORT = process.env.PORT || 8787;
const ENV_LABEL = process.env.NTC_ENV || 'demo';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
  '.webp': 'image/webp', '.gif': 'image/gif'
};

// Serve a file from public/. Returns true if served, false if not found (no response written).
function serveStatic(res, relPath) {
  try {
    let rel = decodeURIComponent(relPath).replace(/^\/+/, '');
    const full = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!full.startsWith(PUBLIC_DIR)) return false; // path traversal guard
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*'
    });
    res.end(fs.readFileSync(full));
    return true;
  } catch (e) { return false; }
}
function serveSpa(res) {
  if (!serveStatic(res, 'index.html')) { res.writeHead(500); res.end('index.html missing'); }
}

/* ----------------------------------------------------------------------- */
/* helpers                                                                  */
/* ----------------------------------------------------------------------- */
function send(res, status, body, extraHeaders = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...extraHeaders
  });
  res.end(payload);
}
function fail(res, status, text) { send(res, status, { errorText: text }); }

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
    });
  });
}

function bearer(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? token.verify(m[1]) : null;
}
function requireAuth(req, res) {
  const claims = bearer(req);
  if (!claims) { fail(res, 401, 'Access token is missing or invalid.'); return null; }
  return claims;
}

function nowIso() { return new Date().toISOString(); }
function tradeDateToday() {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

async function nextAccountId() {
  const accts = await store.list('Accounts');
  const max = accts
    .map((a) => Number(a.id))
    .filter((n) => n < 9000000)
    .reduce((m, n) => Math.max(m, n), 1912000);
  return max + 1;
}

function genPassword() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const b = 'abcdefghijkmnpqrstuvwxyz';
  const n = '23456789';
  const s = '!$#%';
  const pick = (set, k) => Array.from({ length: k }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return pick(a, 2) + pick(s, 1) + pick(n, 2) + pick(b, 4) + pick(n, 1);
}

/* ----------------------------------------------------------------------- */
/* route table                                                              */
/* ----------------------------------------------------------------------- */
const routes = [];
function route(method, path, handler) { routes.push({ method, path, handler }); }

/* --- meta / health --- */
route('GET', '/', async (req, res) => serveSpa(res));
route('GET', '/auth', async (req, res) => { if (!serveStatic(res, 'auth.html')) fail(res, 404, 'auth.html missing'); });
route('GET', '/dashboard', async (req, res) => { if (!serveStatic(res, 'dashboard.html')) fail(res, 404, 'dashboard.html missing'); });
route('GET', '/healthz', async (req, res) => {
  send(res, 200, { service: 'Talero NT Connect mock', env: ENV_LABEL, backend: store.backend, health: 'ok' });
});

route('GET', '/v1', async (req, res) => {
  send(res, 200, {
    resourceGroups: [
      'Get Timestamp', 'OIDC User Info', 'Users', 'Authentication', 'Accounting',
      'Risks', 'Funds', 'Configuration', 'Alerts', 'Customer Applications', 'Orders',
      'Contract Library', 'Personal Info', 'Fees', 'Positions'
    ],
    endpoints: routes.filter((r) => r.path.startsWith('/v1')).map((r) => `${r.method} ${r.path}`)
  });
});

/* --- Get Timestamp --- */
route('GET', '/v1/timestamp', async (req, res) => send(res, 200, { timestamp: nowIso() }));

/* --- Authentication --- */
route('POST', '/v1/auth/accesstokenrequest', async (req, res, ctx) => {
  const b = ctx.body || {};
  const keys = await store.list('ApiKeys');
  const key = keys.find((k) =>
    String(k.cid) === String(b.cid) && String(k.apiKey) === String(b.sec));
  if (!key) return send(res, 200, { errorText: 'Credentials are incorrect: check cid + sec (API key).' });
  if (String(key.status) !== 'active')
    return send(res, 200, { errorText: 'API key is disabled for this environment.' });
  if (b.name && String(b.name) !== String(key.orgAdminUser))
    return send(res, 200, { errorText: 'Unknown user name for this organization.' });

  const admin = await store.findOne('OrgUsers', { name: key.orgAdminUser });
  const { token: t, exp } = token.sign({
    sub: key.orgAdminUser, name: key.orgAdminUser, cid: key.cid,
    orgId: key.organizationId, env: key.environment, scopes: key.scopes
  });
  send(res, 200, {
    accessToken: t,
    mdAccessToken: t,
    expirationTime: new Date(exp * 1000).toISOString(),
    userId: admin ? admin.id : 700001,
    name: key.orgAdminUser,
    userStatus: 'Active',
    hasLive: key.environment === 'live',
    outdatedTaosCount: 0,
    hasFunded: true
  });
});

route('POST', '/v1/auth/renewaccesstoken', async (req, res) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const { token: t, exp } = token.sign({
    sub: claims.sub, name: claims.name, cid: claims.cid,
    orgId: claims.orgId, env: claims.env, scopes: claims.scopes
  });
  send(res, 200, { accessToken: t, mdAccessToken: t, expirationTime: new Date(exp * 1000).toISOString() });
});

/* --- OIDC User Info --- */
route('GET', '/v1/auth/me', async (req, res) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const admin = await store.findOne('OrgUsers', { name: claims.name });
  send(res, 200, admin || { name: claims.name, organizationId: claims.orgId });
});

/* --- Users --- */
route('GET', '/v1/user/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('OrgUsers'));
});
route('GET', '/v1/user/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const u = await store.getById('OrgUsers', ctx.query.id);
  u ? send(res, 200, u) : fail(res, 404, 'User not found.');
});
route('POST', '/v1/user/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.email) return fail(res, 400, 'email is required.');
  const existing = await store.findOne('OrgUsers', { email: b.email });
  if (existing) return send(res, 200, existing);
  const user = await store.insert('OrgUsers', {
    name: b.name || b.email.split('@')[0],
    email: b.email,
    firstName: b.firstName || '',
    lastName: b.lastName || '',
    userStatus: b.userStatus || 'Active',
    organizationId: 5012,
    roles: b.roles || 'Trader',
    professionalStatus: b.professionalStatus || 'NonProfessional',
    timestamp: nowIso()
  });
  send(res, 200, user);
});
route('POST', '/v1/user/createbulk', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const items = (ctx.body && ctx.body.items) || [];
  const out = [];
  for (const b of items) {
    if (!b.email) continue;
    let u = await store.findOne('OrgUsers', { email: b.email });
    if (!u) u = await store.insert('OrgUsers', {
      name: b.name || b.email.split('@')[0], email: b.email,
      firstName: b.firstName || '', lastName: b.lastName || '',
      userStatus: 'Active', organizationId: 5012, roles: b.roles || 'Trader',
      professionalStatus: 'NonProfessional', timestamp: nowIso()
    });
    out.push(u);
  }
  send(res, 200, { created: out.length, users: out });
});

/* --- Accounting: accounts --- */
route('GET', '/v1/account/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('Accounts'));
});
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

// Org account creation (Accounting + AOP). This is the "create an account in the
// sandbox" path: it persists to the datastore and is immediately retrievable.
route('POST', '/v1/account/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  // resolve / create the owner user
  let user = null;
  if (b.userId) user = await store.getById('OrgUsers', b.userId);
  if (!user && b.ownerEmail) {
    user = await store.findOne('OrgUsers', { email: b.ownerEmail });
    if (!user) user = await store.insert('OrgUsers', {
      name: (b.firstName && b.lastName) ? `${b.firstName}.${b.lastName}`.toLowerCase() : b.ownerEmail.split('@')[0],
      email: b.ownerEmail, firstName: b.firstName || '', lastName: b.lastName || '',
      userStatus: 'Active', organizationId: 5012, roles: 'Trader',
      professionalStatus: 'NonProfessional', timestamp: nowIso()
    });
  }
  if (!user) return fail(res, 400, 'Provide userId or ownerEmail to own the account.');

  const id = b.id || await nextAccountId();
  const isSim = (b.accountType === 'Simulation');
  const pwd = genPassword();
  const account = await store.insert('Accounts', {
    id,
    name: b.name || `TAL-${id}`,
    userId: user.id,
    accountType: b.accountType || 'Customer',
    active: isSim ? true : false,
    clearingHouse: isSim ? 'NinjaTrader (Sim)' : 'NinjaTrader Clearing, LLC',
    riskCategoryId: b.riskCategoryId || 1,
    autoLiqProfileId: b.autoLiqProfileId || 2,
    marginAccountType: b.marginAccountType || 'Speculator',
    legalStatus: b.legalStatus || 'Individual',
    archived: false,
    nickname: b.nickname || `${user.firstName || user.name} — ${b.legalStatus || 'Individual'}`,
    ownerEmail: user.email,
    platformPassword: pwd,
    state: isSim ? 'active' : 'pending_funding',
    provisioning: 'provisioned',
    primary: !!b.primary,
    openedDate: nowIso().slice(0, 10),
    timestamp: nowIso()
  });
  // seed a zero cash-balance snapshot so cashBalance reads work immediately
  await store.insert('CashBalances', {
    accountId: id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1,
    cashBalance: isSim ? (b.startingBalance || 150000) : 0,
    realizedPnL: 0, weekRealizedPnL: 0,
    netLiq: isSim ? (b.startingBalance || 150000) : 0, openPnL: 0,
    totalCashValue: isSim ? (b.startingBalance || 150000) : 0,
    initialMargin: 0, maintenanceMargin: 0,
    availableForTrading: isSim ? (b.startingBalance || 150000) : 0
  });
  send(res, 200, account);
});

route('POST', '/v1/account/createbulk', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const items = (ctx.body && ctx.body.items) || [];
  const out = [];
  for (const b of items) {
    const fakeReq = {}; // reuse single-create logic inline
    let user = b.userId ? await store.getById('OrgUsers', b.userId)
      : (b.ownerEmail ? await store.findOne('OrgUsers', { email: b.ownerEmail }) : null);
    if (!user && b.ownerEmail) user = await store.insert('OrgUsers', {
      name: b.ownerEmail.split('@')[0], email: b.ownerEmail, firstName: b.firstName || '',
      lastName: b.lastName || '', userStatus: 'Active', organizationId: 5012, roles: 'Trader',
      professionalStatus: 'NonProfessional', timestamp: nowIso()
    });
    if (!user) continue;
    const id = await nextAccountId();
    const acct = await store.insert('Accounts', {
      id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false,
      clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: b.riskCategoryId || 1,
      autoLiqProfileId: 2, marginAccountType: 'Speculator', legalStatus: b.legalStatus || 'Individual',
      archived: false, nickname: b.nickname || `${user.name} account`, ownerEmail: user.email,
      platformPassword: genPassword(), state: 'pending_funding', provisioning: 'provisioned',
      primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso()
    });
    out.push(acct);
  }
  send(res, 200, { created: out.length, accounts: out });
});

/* --- Accounting: cash balance --- */
route('GET', '/v1/cashBalance/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('CashBalances'));
});
route('GET', '/v1/cashBalance/getcashbalancesnapshot', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const accountId = ctx.query.accountId;
  if (!accountId) return fail(res, 400, 'accountId is required.');
  const snaps = await store.list('CashBalances', { accountId });
  if (!snaps.length) return fail(res, 404, 'No cash-balance snapshot for that account.');
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  send(res, 200, snaps[0]);
});

/* --- Positions --- */
route('GET', '/v1/position/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('Positions', where));
});

/* --- Orders --- */
route('GET', '/v1/order/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('Orders', where));
});

/* --- Funds --- */
route('GET', '/v1/funds/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('Funds', where));
});
route('POST', '/v1/funds/deposit', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId || !b.amount) return fail(res, 400, 'accountId and amount are required.');
  const rec = await store.insert('Funds', {
    accountId: b.accountId, type: 'deposit', method: b.method || 'ACH (Plaid)',
    amount: Number(b.amount), currency: b.currency || 'USD', status: 'pending',
    reference: `DEP-${Date.now()}-${b.accountId}`, createdAt: nowIso(), settledAt: null,
    destinationOfRecord: 'NinjaTrader Clearing, LLC'
  });
  send(res, 200, rec);
});
route('POST', '/v1/funds/withdraw', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId || !b.amount) return fail(res, 400, 'accountId and amount are required.');
  const rec = await store.insert('Funds', {
    accountId: b.accountId, type: 'withdrawal', method: b.method || 'ACH (return-to-originator)',
    amount: Number(b.amount), currency: b.currency || 'USD', status: 'pending_review',
    reference: `WD-${Date.now()}-${b.accountId}`, createdAt: nowIso(), settledAt: null,
    destinationOfRecord: 'NinjaTrader Clearing, LLC'
  });
  send(res, 200, rec);
});

/* --- Risks --- */
route('GET', '/v1/risk/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('RiskSettings', where));
});
route('POST', '/v1/risk/apply', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.accountId) return fail(res, 400, 'accountId is required.');
  const existing = await store.findOne('RiskSettings', { accountId: b.accountId });
  if (existing) { send(res, 200, await store.update('RiskSettings', existing.id, b)); }
  else { send(res, 200, await store.insert('RiskSettings', { scope: 'account', halted: false, ...b })); }
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

/* --- Customer Applications --- */
route('GET', '/v1/customerApplication/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('CustomerApplications'));
});
route('GET', '/v1/customerApplication/item', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const a = await store.getById('CustomerApplications', ctx.query.id);
  a ? send(res, 200, a) : fail(res, 404, 'Application not found.');
});
route('POST', '/v1/customerApplication/create', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  if (!b.applicantEmail) return fail(res, 400, 'applicantEmail is required.');
  const app = await store.insert('CustomerApplications', {
    applicantEmail: b.applicantEmail, legalStatus: b.legalStatus || 'Individual',
    status: 'Submitted', submittedAt: nowIso(), decisionAt: null,
    documentsRequired: '', accountIdIssued: null, method: b.method || 'NT AOP API'
  });
  send(res, 200, app);
});
route('POST', '/v1/customerApplication/approve', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const b = ctx.body || {};
  const app = await store.getById('CustomerApplications', b.id);
  if (!app) return fail(res, 404, 'Application not found.');
  // issue an account on approval
  let user = await store.findOne('OrgUsers', { email: app.applicantEmail });
  if (!user) user = await store.insert('OrgUsers', {
    name: app.applicantEmail.split('@')[0], email: app.applicantEmail, firstName: '', lastName: '',
    userStatus: 'Active', organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional',
    timestamp: nowIso()
  });
  const id = await nextAccountId();
  await store.insert('Accounts', {
    id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false,
    clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: 1, autoLiqProfileId: 2,
    marginAccountType: 'Speculator', legalStatus: app.legalStatus, archived: false,
    nickname: `${app.applicantEmail} — ${app.legalStatus}`, ownerEmail: app.applicantEmail,
    platformPassword: genPassword(), state: 'pending_funding', provisioning: 'provisioned',
    primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso()
  });
  const updated = await store.update('CustomerApplications', app.id, { status: 'Approved', decisionAt: nowIso(), accountIdIssued: id });
  send(res, 200, updated);
});

/* --- Contract Library --- */
route('GET', '/v1/contract/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  send(res, 200, await store.list('Contracts'));
});
route('GET', '/v1/product/list', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const c = await store.list('Contracts');
  send(res, 200, c.map((x) => ({ id: x.productId, name: x.name.replace(/[A-Z]\d$/, ''), exchange: x.exchange, productType: x.productType, currency: x.currency })));
});

/* --- Market data: quotes (md.tradovateapi.com surface) --- */
const QUOTE_BOARD = {
  ES: 5510.00, NQ: 19840.50, YM: 41280, RTY: 2235.4, MES: 5512.25, MNQ: 19841.0,
  CL: 71.85, GC: 2418.6, MYM: 41281, M2K: 2235.6
};
route('GET', '/v1/quotes', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const want = (ctx.query.symbols ? String(ctx.query.symbols).split(',') : Object.keys(QUOTE_BOARD))
    .map((s) => s.trim().toUpperCase()).filter(Boolean);
  const ts = nowIso();
  const out = want.map((sym) => {
    const base = QUOTE_BOARD[sym] != null ? QUOTE_BOARD[sym] : 100 + Math.random() * 100;
    const drift = (Math.random() - 0.5) * base * 0.004;
    const last = Math.round((base + drift) * 100) / 100;
    const tick = sym.startsWith('M') ? 0.25 : 0.25;
    return {
      symbol: sym, bid: Math.round((last - tick) * 100) / 100,
      ask: Math.round((last + tick) * 100) / 100, last,
      change: Math.round(drift * 100) / 100,
      changePct: Math.round((drift / base) * 10000) / 100, timestamp: ts
    };
  });
  send(res, 200, { quotes: out });
});

/* --- Fees / Alerts --- */
route('GET', '/v1/fee/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('Fees', where));
});
route('GET', '/v1/alert/list', async (req, res, ctx) => {
  if (!requireAuth(req, res)) return;
  const where = ctx.query.accountId ? { accountId: ctx.query.accountId } : undefined;
  send(res, 200, await store.list('Alerts', where));
});

/* ----------------------------------------------------------------------- */
/* Talero app-layer auth shim (NOT NT Connect — the Talero customer app).   */
/* Lets the frontend's register/login screens work end-to-end.             */
/* ----------------------------------------------------------------------- */
route('POST', '/app/register', async (req, res, ctx) => {
  const b = ctx.body || {};
  if (!b.email || !b.password) return fail(res, 400, 'email and password are required.');
  let user = await store.findOne('OrgUsers', { email: b.email });
  if (!user) user = await store.insert('OrgUsers', {
    name: b.email.split('@')[0], email: b.email, firstName: b.firstName || '', lastName: b.lastName || '',
    userStatus: 'PendingApplication', organizationId: 5012, roles: 'Trader',
    professionalStatus: 'NonProfessional', timestamp: nowIso()
  });
  const { token: t, exp } = token.sign({ sub: user.id, name: user.name, email: user.email, env: ENV_LABEL, scopes: 'app.customer' });
  send(res, 200, { sessionToken: t, expiresAt: new Date(exp * 1000).toISOString(), user });
});
route('POST', '/app/login', async (req, res, ctx) => {
  const b = ctx.body || {};
  if (!b.email) return fail(res, 400, 'email is required.');
  const user = await store.findOne('OrgUsers', { email: b.email });
  if (!user) return fail(res, 401, 'No account for that email. Register first.');
  const accounts = await store.list('Accounts', { userId: user.id });
  const { token: t, exp } = token.sign({ sub: user.id, name: user.name, email: user.email, env: ENV_LABEL, scopes: 'app.customer' });
  send(res, 200, { sessionToken: t, expiresAt: new Date(exp * 1000).toISOString(), user, accounts });
});
route('GET', '/app/me', async (req, res) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const user = await store.findOne('OrgUsers', { email: claims.email });
  if (!user) return fail(res, 404, 'User not found.');
  const accounts = await store.list('Accounts', { userId: user.id });
  send(res, 200, { user, accounts });
});

/* --- Talero app: customer account operations (session-scoped, no partner key in browser) --- */
async function ownedAccount(claims, id) {
  const acct = await store.getById('Accounts', id);
  if (!acct) return { error: 'Account not found.' };
  if (claims.email && String(acct.ownerEmail) !== String(claims.email)) return { error: 'Not your account.' };
  return { acct };
}

route('POST', '/app/account/open', async (req, res, ctx) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const b = ctx.body || {};
  const user = await store.findOne('OrgUsers', { email: claims.email });
  if (!user) return fail(res, 404, 'User not found.');
  const id = await nextAccountId();
  const acct = await store.insert('Accounts', {
    id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: false,
    clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: 1, autoLiqProfileId: 2,
    marginAccountType: 'Speculator', legalStatus: b.legalStatus || 'Individual', archived: false,
    nickname: b.nickname || `${user.firstName || user.name} — ${b.legalStatus || 'Individual'}`,
    ownerEmail: user.email, platformPassword: genPassword(), state: 'pending_funding',
    provisioning: 'provisioned', primary: false, openedDate: nowIso().slice(0, 10), timestamp: nowIso()
  });
  await store.insert('CashBalances', {
    accountId: id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1,
    cashBalance: 0, realizedPnL: 0, weekRealizedPnL: 0, netLiq: 0, openPnL: 0,
    totalCashValue: 0, initialMargin: 0, maintenanceMargin: 0, availableForTrading: 0
  });
  send(res, 200, acct);
});

route('GET', '/app/account', async (req, res, ctx) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const { acct, error } = await ownedAccount(claims, ctx.query.id);
  if (error) return fail(res, 404, error);
  const snaps = await store.list('CashBalances', { accountId: acct.id });
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const positions = await store.list('Positions', { accountId: acct.id });
  const orders = await store.list('Orders', { accountId: acct.id });
  send(res, 200, { account: acct, balance: snaps[0] || null, positions, orders });
});

route('POST', '/app/account/deposit', async (req, res, ctx) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const b = ctx.body || {};
  const { acct, error } = await ownedAccount(claims, b.accountId);
  if (error) return fail(res, 404, error);
  const amt = Number(b.amount) || 0;
  if (amt <= 0) return fail(res, 400, 'amount must be > 0.');
  await store.insert('Funds', {
    accountId: acct.id, type: 'deposit', method: b.method || 'ACH (Plaid)', amount: amt,
    currency: 'USD', status: 'settled', reference: `DEP-${Date.now()}-${acct.id}`,
    createdAt: nowIso(), settledAt: nowIso(), destinationOfRecord: 'NinjaTrader Clearing, LLC'
  });
  const snaps = await store.list('CashBalances', { accountId: acct.id });
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const snap = snaps[0];
  if (snap) {
    const cash = (Number(snap.cashBalance) || 0) + amt;
    await store.update('CashBalances', snap.id, {
      cashBalance: cash, totalCashValue: cash,
      netLiq: cash + (Number(snap.openPnL) || 0), availableForTrading: cash, timestamp: nowIso()
    });
  }
  if (!acct.active) await store.update('Accounts', acct.id, { active: true, state: 'active' });
  send(res, 200, { ok: true, deposited: amt });
});

route('POST', '/app/account/simulate', async (req, res, ctx) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const b = ctx.body || {};
  const { acct, error } = await ownedAccount(claims, b.accountId);
  if (error) return fail(res, 404, error);
  const contracts = await store.list('Contracts');
  const micro = contracts.filter((c) => String(c.name).startsWith('M'));
  const pool = micro.length ? micro : contracts;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const side = Math.random() > 0.5 ? 'Buy' : 'Sell';
  const qty = 1 + Math.floor(Math.random() * 3);
  const px = Math.round((5000 + Math.random() * 15000) * 100) / 100;
  const tickVal = Number(pick.tickValue) || 1.25;
  const realized = Math.round((Math.random() - 0.45) * qty * tickVal * 40 * 100) / 100;
  const open = Math.round((Math.random() - 0.4) * qty * tickVal * 30 * 100) / 100;
  await store.insert('Orders', {
    accountId: acct.id, contractId: pick.id, symbol: pick.name, action: side,
    orderType: 'Market', orderQty: qty, price: null, ordStatus: 'Filled',
    filledQty: qty, avgFillPrice: px, timestamp: nowIso()
  });
  await store.insert('Positions', {
    accountId: acct.id, contractId: pick.id, symbol: pick.name,
    netPos: side === 'Buy' ? qty : -qty, netPrice: px, bought: side === 'Buy' ? qty : 0,
    boughtValue: side === 'Buy' ? px * qty : 0, sold: side === 'Sell' ? qty : 0,
    soldValue: side === 'Sell' ? px * qty : 0, prevPos: 0, openPnL: open, timestamp: nowIso()
  });
  const snaps = await store.list('CashBalances', { accountId: acct.id });
  snaps.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  let snap = snaps[0];
  if (!snap) {
    snap = await store.insert('CashBalances', {
      accountId: acct.id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1,
      cashBalance: 0, realizedPnL: 0, weekRealizedPnL: 0, netLiq: 0, openPnL: 0,
      totalCashValue: 0, initialMargin: 0, maintenanceMargin: 0, availableForTrading: 0
    });
  }
  const cash = Math.round(((Number(snap.cashBalance) || 0) + realized) * 100) / 100;
  const updated = await store.update('CashBalances', snap.id, {
    cashBalance: cash, totalCashValue: cash,
    realizedPnL: Math.round(((Number(snap.realizedPnL) || 0) + realized) * 100) / 100,
    weekRealizedPnL: Math.round(((Number(snap.weekRealizedPnL) || 0) + realized) * 100) / 100,
    openPnL: open, netLiq: Math.round((cash + open) * 100) / 100, availableForTrading: cash, timestamp: nowIso()
  });
  send(res, 200, { ok: true, trade: { symbol: pick.name, side, qty, price: px, realized, openPnL: open }, balance: updated });
});

/* ----------------------------------------------------------------------- */
/* dispatcher                                                               */
/* ----------------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(url.searchParams.entries());
  const match = routes.find((r) => r.method === req.method && r.path === path);
  if (!match) {
    if (req.method === 'GET' && !path.startsWith('/v1') && !path.startsWith('/app')) {
      if (serveStatic(res, path === '/' ? 'index.html' : path)) return;   // static asset (jsx, svg, ...)
      if (!path.includes('.')) return serveSpa(res);                        // unknown route -> landing
      return fail(res, 404, 'Not found: ' + path);
    }
    return fail(res, 404, `No route ${req.method} ${path}`);
  }
  try {
    const body = (req.method === 'POST') ? await readBody(req) : {};
    await match.handler(req, res, { query, body });
  } catch (e) {
    console.error('[error]', e);
    fail(res, 500, 'Internal mock error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`Talero NT Connect mock listening on :${PORT}  (env=${ENV_LABEL}, backend=${store.backend})`);
});
