'use strict';
process.env.NODE_ENV = 'test';
process.env.DATA_BACKEND = 'local';
const test = require('node:test');
const assert = require('node:assert');

require('../scripts/reset.js'); // fresh seed (overwrite db.json)
const { start, server, token } = require('../dist/server');

let BASE;
const KEY = { name: 'talero.partner.admin', appId: 'Talero.NTConnect.Partner', appVersion: '1.0', cid: 80432, sec: 'ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5' };

test.before(async () => { await start(0); BASE = 'http://127.0.0.1:' + server.address().port; });
test.after(() => { server.close(); });

function j(p, opts) { return fetch(BASE + p, opts).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })); }
const H = (t, extra) => Object.assign({ Authorization: 'Bearer ' + t }, extra || {});
const JH = (t) => H(t, { 'Content-Type': 'application/json' });
async function partnerToken() {
  const r = await j('/v1/auth/accesstokenrequest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(KEY) });
  return r.body.accessToken;
}

test('healthz ok', async () => { const r = await j('/healthz'); assert.equal(r.status, 200); assert.equal(r.body.health, 'ok'); });
test('v1 index lists endpoints', async () => { const r = await j('/v1'); assert.equal(r.status, 200); assert.ok(r.body.endpoints.length > 10); });
test('timestamp ISO', async () => { const r = await j('/v1/timestamp'); assert.match(r.body.timestamp, /\dT\d/); });
test('auth bad key -> errorText', async () => { const r = await j('/v1/auth/accesstokenrequest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: 1, sec: 'nope' }) }); assert.ok(r.body.errorText); });
test('auth good key -> JWT', async () => { const t = await partnerToken(); assert.equal((t || '').split('.').length, 3); });
test('account/list 401 without token', async () => { assert.equal((await j('/v1/account/list')).status, 401); });
test('account/list with token >=5', async () => { const t = await partnerToken(); const r = await j('/v1/account/list', { headers: H(t) }); assert.ok(r.body.length >= 5); });
test('account/item by id', async () => { const t = await partnerToken(); assert.equal((await j('/v1/account/item?id=1912208', { headers: H(t) })).body.id, 1912208); });
test('account/create persists + snapshot', async () => {
  const t = await partnerToken();
  const c = await j('/v1/account/create', { method: 'POST', headers: JH(t), body: JSON.stringify({ ownerEmail: 't1@example.com', firstName: 'T', lastName: 'One' }) });
  assert.equal(c.status, 200); const id = c.body.id; assert.ok(id);
  assert.equal((await j('/v1/account/item?id=' + id, { headers: H(t) })).body.id, id);
  assert.equal((await j('/v1/cashBalance/getcashbalancesnapshot?accountId=' + id, { headers: H(t) })).body.cashBalance, 0);
});
test('read endpoints 200', async () => {
  const t = await partnerToken();
  for (const p of ['/v1/position/list', '/v1/order/list', '/v1/funds/list', '/v1/risk/list', '/v1/contract/list', '/v1/product/list', '/v1/fee/list', '/v1/alert/list', '/v1/cashBalance/list', '/v1/quotes?symbols=ES,NQ,YM'])
    assert.equal((await j(p, { headers: H(t) })).status, 200, p);
});
test('funds deposit + withdraw', async () => {
  const t = await partnerToken();
  assert.equal((await j('/v1/funds/deposit', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: 1912208, amount: 1000 }) })).body.type, 'deposit');
  assert.equal((await j('/v1/funds/withdraw', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: 1912208, amount: 500 }) })).body.status, 'pending_review');
});
test('risk apply + halt (account + org)', async () => {
  const t = await partnerToken();
  assert.equal((await j('/v1/risk/apply', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: 1912208, dailyLossLimit: 999 }) })).status, 200);
  assert.equal((await j('/v1/risk/halt', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: 1912208, halted: true }) })).body.halted, true);
  assert.equal((await j('/v1/risk/halt', { method: 'POST', headers: JH(t), body: JSON.stringify({ scope: 'org', halted: false }) })).body.scope, 'org');
});
test('customerApplication create + approve issues account', async () => {
  const t = await partnerToken();
  const c = await j('/v1/customerApplication/create', { method: 'POST', headers: JH(t), body: JSON.stringify({ applicantEmail: 'app1@example.com', legalStatus: 'Individual' }) });
  const ap = await j('/v1/customerApplication/approve', { method: 'POST', headers: JH(t), body: JSON.stringify({ id: c.body.id }) });
  assert.equal(ap.body.status, 'Approved'); assert.ok(ap.body.accountIdIssued);
});
test('users list/create/bulk', async () => {
  const t = await partnerToken();
  assert.equal((await j('/v1/user/list', { headers: H(t) })).status, 200);
  assert.ok((await j('/v1/user/create', { method: 'POST', headers: JH(t), body: JSON.stringify({ email: 'u1@example.com' }) })).body.id);
  assert.equal((await j('/v1/user/createbulk', { method: 'POST', headers: JH(t), body: JSON.stringify({ items: [{ email: 'b1@example.com' }, { email: 'b2@example.com' }] }) })).body.created, 2);
});
test('renew + me', async () => {
  const t = await partnerToken();
  assert.equal((await j('/v1/auth/renewaccesstoken', { method: 'POST', headers: H(t) })).status, 200);
  assert.equal((await j('/v1/auth/me', { headers: H(t) })).status, 200);
});
test('app register/login/me', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'jane@example.com', password: 'password123', firstName: 'Jane' }) });
  assert.ok(reg.body.sessionToken);
  assert.ok((await j('/app/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'jane@example.com', password: 'password123' }) })).body.sessionToken);
  assert.equal((await j('/app/me', { headers: H(reg.body.sessionToken) })).status, 200);
});
test('app open/deposit/simulate + ownership guard', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sim@example.com', password: 'password123' }) });
  const t = reg.body.sessionToken;
  const id = (await j('/app/account/open', { method: 'POST', headers: JH(t), body: JSON.stringify({ nickname: 'T' }) })).body.id; assert.ok(id);
  assert.equal((await j('/app/account/deposit', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: id, amount: 5000 }) })).body.ok, true);
  const sim = await j('/app/account/simulate', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: id }) });
  assert.equal(sim.body.ok, true); assert.ok(sim.body.trade);
  const other = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'other@example.com', password: 'password123' }) });
  assert.equal((await j('/app/account?id=' + id, { headers: H(other.body.sessionToken) })).status, 404);
});
test('static: /, /auth, /dashboard, /td-app.jsx, 404', async () => {
  assert.equal((await fetch(BASE + '/')).status, 200);
  assert.equal((await fetch(BASE + '/auth')).status, 200);
  assert.equal((await fetch(BASE + '/dashboard')).status, 200);
  assert.equal((await fetch(BASE + '/td-app.jsx')).status, 200);
  assert.equal((await fetch(BASE + '/nope.js')).status, 404);
});
test('static: path-traversal blocked', async () => {
  const r = await fetch(BASE + '/../package.json');
  assert.notEqual(r.status, 200);
});
test('token sign/verify + tamper', () => {
  const s = token.sign({ sub: 'x' });
  assert.ok(token.verify(s.token));
  assert.equal(token.verify(s.token + 'x'), null);
  assert.equal(token.verify('a.b.c'), null);
  assert.equal(token.verify(''), null);
});

test('blocker B4/B5: wrong password 401, existing email 409', async () => {
  await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dup@example.com', password: 'password123' }) });
  assert.equal((await j('/app/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dup@example.com', password: 'wrongpass1' }) })).status, 401);
  assert.equal((await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dup@example.com', password: 'password123' }) })).status, 409);
});
test('seeded user logs in with demo password', async () => {
  const r = await j('/app/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'jordan.castillo@example.com', password: 'TaleroDemo1!' }) });
  assert.ok(r.body.sessionToken); assert.ok(r.body.accounts.length >= 1);
});
test('blocker H7: partner token rejected from /app', async () => {
  const t = await partnerToken();
  assert.equal((await j('/app/account?id=1912208', { headers: H(t) })).status, 403);
  assert.equal((await j('/app/account/deposit', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: 1912208, amount: 100 }) })).status, 403);
});
test('deposit rejects non-positive / NaN amount', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'neg@example.com', password: 'password123' }) });
  const h = JH(reg.body.sessionToken);
  const id = (await j('/app/account/open', { method: 'POST', headers: h, body: JSON.stringify({}) })).body.id;
  assert.equal((await j('/app/account/deposit', { method: 'POST', headers: h, body: JSON.stringify({ accountId: id, amount: -5 }) })).status, 400);
  assert.equal((await j('/app/account/deposit', { method: 'POST', headers: h, body: JSON.stringify({ accountId: id, amount: 'abc' }) })).status, 400);
});
test('blocker B6: concurrent deposits do not lose money', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'race@example.com', password: 'password123' }) });
  const h = JH(reg.body.sessionToken);
  const id = (await j('/app/account/open', { method: 'POST', headers: h, body: JSON.stringify({}) })).body.id;
  await Promise.all(Array.from({ length: 6 }, () => j('/app/account/deposit', { method: 'POST', headers: h, body: JSON.stringify({ accountId: id, amount: 100 }) })));
  const bal = (await j('/app/account?id=' + id, { headers: H(reg.body.sessionToken) })).body.balance;
  assert.equal(bal.cashBalance, 600);
});
test('password.verify handles malformed/empty stored hashes (H9)', () => {
  const pw = require('../dist/lib/password');
  assert.equal(pw.verify('x', null), false);
  assert.equal(pw.verify('x', 'notscrypt'), false);
  assert.equal(pw.verify('x', 'scrypt$bad$nothex'), false);
  const h = pw.hash('secret123');
  assert.ok(pw.verify('secret123', h));
  assert.equal(pw.verify('wrong', h), false);
});
test('oauth: start (sandbox) redirects to the simulator', async () => {
  const r = await fetch(BASE + '/oauth/start?provider=google', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/oauth\/sim\?provider=google/);
});
test('oauth: full sandbox Google flow creates a session + user', async () => {
  const s = await fetch(BASE + '/oauth/start?provider=google', { redirect: 'manual' });
  const state = decodeURIComponent(s.headers.get('location').match(/state=([^&]+)/)[1]);
  const sim = await fetch(BASE + '/oauth/sim', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ provider: 'google', state, email: 'gmailer@gmail.com', name: 'G Mailer' }), redirect: 'manual' });
  assert.equal(sim.status, 302);
  const cb = await fetch(BASE + sim.headers.get('location'), { redirect: 'manual' });
  assert.equal(cb.status, 302);
  const fin = cb.headers.get('location');
  assert.match(fin, /\/auth#access=/);
  const tk = decodeURIComponent(fin.match(/access=([^&]+)/)[1]);
  const me = await j('/app/me', { headers: H(tk) });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'gmailer@gmail.com');
  assert.equal(me.body.user.provider, 'google');
});
test('oauth: tampered state is rejected', async () => {
  const r = await fetch(BASE + '/oauth/callback?provider=google&state=bad&sim=x', { redirect: 'manual' });
  assert.equal(r.status, 400);
});
async function adminToken() {
  const r = await j('/app/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ops@talero.markets', password: 'TaleroAdmin1!' }) });
  return r.body.sessionToken;
}
test('admin: customer forbidden (403), admin allowed (200)', async () => {
  const cust = (await j('/app/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'jordan.castillo@example.com', password: 'TaleroDemo1!' }) })).body.sessionToken;
  assert.equal((await j('/admin/summary', { headers: H(cust) })).status, 403);
  const at = await adminToken(); assert.ok(at);
  const s = await j('/admin/summary', { headers: H(at) });
  assert.equal(s.status, 200); assert.ok(s.body.accounts >= 5);
});
test('admin: users list omits passwordHash; suspend+reactivate are audited', async () => {
  const at = await adminToken(); const h = H(at);
  const users = await j('/admin/users', { headers: h });
  assert.ok(users.body.length >= 5 && users.body.every((u) => !('passwordHash' in u)));
  await j('/admin/account/suspend', { method: 'POST', headers: JH(at), body: JSON.stringify({ accountId: 1912208 }) });
  assert.equal((await j('/admin/account?id=1912208', { headers: h })).body.account.state, 'suspended');
  await j('/admin/account/reactivate', { method: 'POST', headers: JH(at), body: JSON.stringify({ accountId: 1912208 }) });
  const audit = await j('/admin/audit', { headers: h });
  assert.ok(audit.body.some((e) => e.action === 'account.suspend'));
});
test('idempotent deposit does not double-credit', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'idem@example.com', password: 'password123' }) });
  const tok = reg.body.sessionToken;
  const id = (await j('/app/account/open', { method: 'POST', headers: JH(tok), body: JSON.stringify({}) })).body.id;
  const hk = H(tok, { 'Content-Type': 'application/json', 'Idempotency-Key': 'dep-abc-123' });
  await j('/app/account/deposit', { method: 'POST', headers: hk, body: JSON.stringify({ accountId: id, amount: 500 }) });
  await j('/app/account/deposit', { method: 'POST', headers: hk, body: JSON.stringify({ accountId: id, amount: 500 }) });
  const bal = (await j('/app/account?id=' + id, { headers: H(tok) })).body.balance;
  assert.equal(bal.cashBalance, 500);
});
test('metrics endpoint exposes Prometheus counters', async () => {
  const r = await fetch(BASE + '/metrics'); assert.equal(r.status, 200);
  assert.match(await r.text(), /talero_/);
});

// ---------- AOP / KYC (NinjaTrader Clearing account opening) ----------
const APP = (t, body) => j('/app/application', { method: 'POST', headers: JH(t), body: JSON.stringify(body) });
const cleanApp = { legalStatus: 'Individual', country: 'United States', idDocProvided: true, addressDocProvided: true, ssnProvided: true, agreements: { cust: true, nfa: true, risk: true, suit: true, md: true }, eConsent: true };

test('KYC: clean submission is approved, issues a pending account, funding activates it', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'kyc.clean@example.com', password: 'password123', firstName: 'Clean', lastName: 'Applicant' }) });
  const t = reg.body.sessionToken;
  const sub = await APP(t, cleanApp);
  assert.equal(sub.status, 200);
  assert.equal(sub.body.application.status, 'Approved');
  assert.equal(sub.body.application.lifecycle, 'Awaiting Funding');
  assert.equal(sub.body.application.kycStatus, 'Verified');
  assert.ok(sub.body.application.accountIdIssued);
  assert.equal('rejectionReasonInternal' in sub.body.application, false); // never leak internal fields
  const me = await j('/app/me', { headers: H(t) });
  assert.ok(me.body.accounts.length >= 1);
  assert.equal(me.body.onboarding.application.lifecycle, 'Awaiting Funding');
  const acctId = sub.body.application.accountIdIssued;
  await j('/app/account/deposit', { method: 'POST', headers: JH(t), body: JSON.stringify({ accountId: acctId, amount: 2500 }) });
  const st = await j('/app/application', { headers: H(t) });
  assert.equal(st.body.application.lifecycle, 'Active');
});

test('KYC: restricted jurisdiction is rejected, no account, no leaked reason', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'kyc.reject@example.com', password: 'password123' }) });
  const t = reg.body.sessionToken;
  const sub = await APP(t, { ...cleanApp, country: 'Russia', ssnProvided: false, w8benProvided: true });
  assert.equal(sub.body.application.status, 'Rejected');
  assert.equal(sub.body.application.lifecycle, 'Rejected');
  assert.equal('rejectionReasonInternal' in sub.body.application, false);
  const me = await j('/app/me', { headers: H(t) });
  assert.equal((me.body.accounts || []).length, 0);
});

test('KYC: missing docs -> documents required -> resolved on upload', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'kyc.docs@example.com', password: 'password123' }) });
  const t = reg.body.sessionToken;
  const sub = await APP(t, { ...cleanApp, idDocProvided: false, addressDocProvided: false, ssnProvided: false });
  assert.equal(sub.body.application.status, 'Documents required');
  assert.equal(sub.body.application.lifecycle, 'KYC Pending');
  assert.ok(sub.body.application.documentsRequired.length >= 1);
  const done = await j('/app/application/documents', { method: 'POST', headers: JH(t), body: JSON.stringify({ idDocProvided: true, addressDocProvided: true, ssnProvided: true }) });
  assert.equal(done.body.application.status, 'Approved');
  assert.ok(done.body.application.accountIdIssued);
});

test('KYC: agreements incomplete -> Agreements Pending (no account)', async () => {
  const reg = await j('/app/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'kyc.agree@example.com', password: 'password123' }) });
  const t = reg.body.sessionToken;
  const sub = await APP(t, { ...cleanApp, agreements: { cust: true, nfa: true } });
  assert.equal(sub.body.application.lifecycle, 'Agreements Pending');
  assert.equal(sub.body.application.accountIdIssued, null);
});

test('admin: AOP queue lists + filters, approve issues an account (audited)', async () => {
  const at = await adminToken();
  const all = await j('/admin/applications', { headers: H(at) });
  assert.ok(all.body.length >= 7);
  const pend = await j('/admin/applications?status=' + encodeURIComponent('KYC Pending'), { headers: H(at) });
  assert.ok(pend.body.length >= 1 && pend.body.every((a) => a.lifecycle === 'KYC Pending'));
  const ap = await j('/admin/application/approve', { method: 'POST', headers: JH(at), body: JSON.stringify({ id: 90006 }) });
  assert.equal(ap.body.lifecycle, 'Awaiting Funding'); assert.ok(ap.body.accountIdIssued);
  const audit = await j('/admin/audit', { headers: H(at) });
  assert.ok(audit.body.some((e) => e.action === 'application.approve'));
});

test('admin: reject keeps reason internal; request-docs sets outstanding docs', async () => {
  const at = await adminToken();
  const rej = await j('/admin/application/reject', { method: 'POST', headers: JH(at), body: JSON.stringify({ id: 90007, reason: 'KYC / identity could not be verified' }) });
  assert.equal(rej.body.lifecycle, 'Rejected');
  assert.equal(rej.body.rejectionReasonInternal, 'KYC / identity could not be verified');
  const dr = await j('/admin/application/request-docs', { method: 'POST', headers: JH(at), body: JSON.stringify({ id: 90004, documents: ['Proof of address (< 90 days)'] }) });
  assert.equal(dr.body.status, 'Documents required');
  assert.deepEqual(dr.body.documentsRequired, ['Proof of address (< 90 days)']);
});

test('partner: customerApplication/reject sets Rejected + records internal reason', async () => {
  const t = await partnerToken();
  const c = await j('/v1/customerApplication/create', { method: 'POST', headers: JH(t), body: JSON.stringify({ applicantEmail: 'preject@example.com' }) });
  const r = await j('/v1/customerApplication/reject', { method: 'POST', headers: JH(t), body: JSON.stringify({ id: c.body.id, reason: 'Duplicate / fraud signal' }) });
  assert.equal(r.body.status, 'Rejected');
  assert.equal(r.body.rejectionReasonInternal, 'Duplicate / fraud signal');
});
