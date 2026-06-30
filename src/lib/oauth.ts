import * as crypto from 'crypto';
import * as token from './token';

export interface OAuthProfile { email: string; name?: string; sub: string; picture?: string; provider: string; }
export interface ProviderCfg { id: string; authUrl: string; tokenUrl: string; tokenInfoUrl: string; scope: string; clientId?: string; clientSecret?: string; }

/** Provider registry. Add Apple/X/GitHub here by returning their endpoints + env-backed creds. */
export function getProvider(id: string): ProviderCfg | null {
  if (id === 'google') {
    return {
      id, authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      tokenInfoUrl: 'https://oauth2.googleapis.com/tokeninfo',
      scope: 'openid email profile',
      clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return null;
}
export function isConfigured(p: ProviderCfg): boolean { return Boolean(p.clientId && p.clientSecret); }

export function signState(provider: string): string {
  return token.sign({ oauthState: true, provider, nonce: crypto.randomUUID() }, 600).token;
}
export function verifyState(state: string, provider: string): boolean {
  const c = token.verify(state) as Record<string, unknown> | null;
  return Boolean(c && c.oauthState === true && c.provider === provider);
}

/** Sandbox simulator: a signed assertion standing in for a real provider ID token. */
export function signSim(profile: OAuthProfile): string {
  return token.sign({ oauthSim: true, provider: profile.provider, email: profile.email, name: profile.name, sub: profile.sub }, 600).token;
}
export function verifySim(sim: string, provider: string): OAuthProfile | null {
  const c = token.verify(sim) as Record<string, unknown> | null;
  if (!c || c.oauthSim !== true || c.provider !== provider) return null;
  return { email: String(c.email), name: c.name ? String(c.name) : undefined, sub: String(c.sub), provider };
}

export function buildAuthUrl(p: ProviderCfg, redirectUri: string, state: string): string {
  const q = new URLSearchParams({ client_id: p.clientId || '', redirect_uri: redirectUri, response_type: 'code', scope: p.scope, state, access_type: 'online', prompt: 'select_account' });
  return `${p.authUrl}?${q.toString()}`;
}

/** Real flow: exchange the auth code and verify the returned ID token. */
export async function exchangeAndVerify(p: ProviderCfg, code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokRes = await fetch(p.tokenUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: p.clientId || '', client_secret: p.clientSecret || '', redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokRes.ok) throw new Error('Token exchange failed: ' + (await tokRes.text()));
  const tok = await tokRes.json() as { id_token?: string };
  if (!tok.id_token) throw new Error('No id_token returned');
  const infoRes = await fetch(`${p.tokenInfoUrl}?id_token=${encodeURIComponent(tok.id_token)}`);
  if (!infoRes.ok) throw new Error('ID token verification failed');
  const info = await infoRes.json() as { aud?: string; email?: string; name?: string; sub?: string; picture?: string; email_verified?: string };
  if (info.aud !== p.clientId) throw new Error('ID token audience mismatch');
  if (!info.email) throw new Error('No email in ID token');
  return { email: info.email, name: info.name, sub: String(info.sub), picture: info.picture, provider: p.id };
}
