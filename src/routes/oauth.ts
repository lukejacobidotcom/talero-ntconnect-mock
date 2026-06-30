import type { IncomingMessage } from 'http';
import { route } from '../router';
import { send, fail, redirect } from '../lib/http';
import { ENV_LABEL } from '../config';
import * as oauth from '../lib/oauth';
import * as token from '../lib/token';
import { upsertOAuthUser } from '../services/users';

function redirectUriFor(req: IncomingMessage): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost:8787';
  return `${proto}://${host}/oauth/callback`;
}

route('GET', '/oauth/start', async (req, res, ctx) => {
  const providerId = String(ctx.query.provider || 'google');
  const p = oauth.getProvider(providerId);
  if (!p) return fail(res, 400, `Unsupported provider: ${providerId}`);
  const state = oauth.signState(providerId);
  if (oauth.isConfigured(p)) return redirect(res, oauth.buildAuthUrl(p, redirectUriFor(req), state));
  // sandbox: no real client credentials -> simulator
  return redirect(res, `/oauth/sim?provider=${providerId}&state=${encodeURIComponent(state)}`);
});

// Sandbox-only consent screen.
route('GET', '/oauth/sim', async (_req, res, ctx) => {
  const provider = String(ctx.query.provider || 'google');
  const state = String(ctx.query.state || '');
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sandbox ${provider} sign-in</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0a1626;color:#e8eef6;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#0f2236;border:1px solid #1d3450;border-radius:14px;padding:28px;width:360px;max-width:92%}
h1{font-size:18px;margin:0 0 4px}.muted{color:#93a4ba;font-size:13px;margin:0 0 18px}
label{font-size:12px;color:#93a4ba}input{width:100%;box-sizing:border-box;margin:6px 0 14px;padding:11px;border-radius:9px;border:1px solid #1d3450;background:#0a1626;color:#e8eef6}
button{width:100%;padding:11px;border:0;border-radius:9px;background:linear-gradient(135deg,#2f6fed,#1b4fc2);color:#fff;font-weight:700;cursor:pointer}
.tag{display:inline-block;font-size:11px;color:#d9a441;border:1px solid rgba(217,164,65,.4);border-radius:99px;padding:3px 8px;margin-bottom:12px}</style>
<div class="card">
  <span class="tag">SANDBOX</span>
  <h1>Continue with ${provider[0].toUpperCase()+provider.slice(1)}</h1>
  <p class="muted">No real ${provider} credentials are configured, so this simulates the provider for the demo.</p>
  <form method="POST" action="/oauth/sim">
    <input type="hidden" name="provider" value="${provider}">
    <input type="hidden" name="state" value="${state}">
    <label>Email</label><input name="email" type="email" value="trader@gmail.com" required>
    <label>Name</label><input name="name" type="text" value="Demo Trader">
    <button type="submit">Continue</button>
  </form>
</div>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

route('POST', '/oauth/sim', async (_req, res, ctx) => {
  const b = ctx.body || {};
  const provider = String(b.provider || 'google');
  const state = String(b.state || '');
  if (!oauth.verifyState(state, provider)) return fail(res, 400, 'Invalid or expired state.');
  const sim = oauth.signSim({ email: String(b.email || ''), name: String(b.name || ''), sub: 'sim-' + Buffer.from(String(b.email)).toString('hex').slice(0, 12), provider });
  return redirect(res, `/oauth/callback?provider=${provider}&state=${encodeURIComponent(state)}&sim=${encodeURIComponent(sim)}`);
});

route('GET', '/oauth/callback', async (req, res, ctx) => {
  const providerId = String(ctx.query.provider || 'google');
  const p = oauth.getProvider(providerId);
  if (!p) return fail(res, 400, `Unsupported provider: ${providerId}`);
  if (!oauth.verifyState(String(ctx.query.state || ''), providerId)) return fail(res, 400, 'Invalid or expired state.');
  let profile;
  try {
    if (ctx.query.sim) {
      profile = oauth.verifySim(String(ctx.query.sim), providerId);
      if (!profile) return fail(res, 400, 'Invalid sandbox assertion.');
    } else if (ctx.query.code) {
      profile = await oauth.exchangeAndVerify(p, String(ctx.query.code), redirectUriFor(req));
    } else {
      return fail(res, 400, 'Missing code.');
    }
    const user = await upsertOAuthUser(profile);
    const { token: t } = token.sign({ sub: Number(user.id), name: String(user.name), email: String(user.email), env: ENV_LABEL, scopes: 'app.customer' });
    return redirect(res, `/auth#access=${encodeURIComponent(t)}&email=${encodeURIComponent(String(user.email))}`);
  } catch (e) {
    return fail(res, 502, 'Social sign-in failed: ' + (e as Error).message);
  }
});
