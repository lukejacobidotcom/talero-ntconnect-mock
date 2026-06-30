import { store } from '../store';
import { nowIso } from '../lib/time';
import type { OAuthProfile } from '../lib/oauth';
import type { Row } from '../types';

/** Find-or-create a user from a verified OAuth profile; links provider to an existing email. */
export async function upsertOAuthUser(profile: OAuthProfile): Promise<Row> {
  const email = profile.email.trim().toLowerCase();
  const existing = await store.findOne('OrgUsers', { email });
  if (existing) {
    if (!existing.provider) await store.update('OrgUsers', existing.id, { provider: profile.provider, providerId: profile.sub });
    return existing;
  }
  const parts = (profile.name || '').trim().split(/\s+/);
  return store.insert('OrgUsers', {
    name: email.split('@')[0], email, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '',
    userStatus: 'PendingApplication', organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional',
    provider: profile.provider, providerId: profile.sub, avatar: profile.picture || '', timestamp: nowIso(),
  });
}
