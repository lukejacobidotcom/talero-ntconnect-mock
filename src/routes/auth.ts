import { route } from '../router';
import { send } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import * as token from '../lib/token';
import { store } from '../store';
import { SANDBOX_PARTNER_SECRET } from '../config';

route('POST', '/v1/auth/accesstokenrequest', async (_req, res, ctx) => {
  const b = ctx.body || {};
  const keys = await store.list('ApiKeys');
  const key = keys.find((k) => String(k.cid) === String(b.cid));
  const expectedSec = key ? (process.env[String(key.secretEnv)] || (key.environment === 'demo' ? SANDBOX_PARTNER_SECRET : null)) : null;
  if (!key || !expectedSec || String(b.sec) !== String(expectedSec)) {
    return send(res, 200, { errorText: 'Credentials are incorrect: check cid + sec (API key).' });
  }
  if (String(key.status) !== 'active') return send(res, 200, { errorText: 'API key is disabled for this environment.' });
  if (b.name && String(b.name) !== String(key.orgAdminUser)) return send(res, 200, { errorText: 'Unknown user name for this organization.' });
  const admin = await store.findOne('OrgUsers', { name: key.orgAdminUser as string });
  const { token: t, exp } = token.sign({ sub: String(key.orgAdminUser), name: String(key.orgAdminUser), cid: Number(key.cid), orgId: Number(key.organizationId), env: String(key.environment), scopes: String(key.scopes) });
  send(res, 200, { accessToken: t, mdAccessToken: t, expirationTime: new Date(exp * 1000).toISOString(), userId: admin ? admin.id : 700001, name: key.orgAdminUser, userStatus: 'Active', hasLive: key.environment === 'live', outdatedTaosCount: 0, hasFunded: true });
});

route('POST', '/v1/auth/renewaccesstoken', async (req, res) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const { token: t, exp } = token.sign({ sub: claims.sub, name: claims.name, cid: claims.cid, orgId: claims.orgId, env: claims.env, scopes: claims.scopes });
  send(res, 200, { accessToken: t, mdAccessToken: t, expirationTime: new Date(exp * 1000).toISOString() });
});

route('GET', '/v1/auth/me', async (req, res) => {
  const claims = requireAuth(req, res); if (!claims) return;
  const admin = await store.findOne('OrgUsers', { name: String(claims.name) });
  send(res, 200, admin || { name: claims.name, organizationId: claims.orgId });
});
