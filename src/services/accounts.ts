import { store } from '../store';
import { nowIso, tradeDateToday } from '../lib/time';
import type { Claims, Row } from '../types';

export async function nextAccountId(): Promise<number> {
  const accts = await store.list('Accounts');
  const max = accts.map((a) => Number(a.id)).filter((n) => n < 9000000).reduce((m, n) => Math.max(m, n), 1912000);
  return max + 1;
}

export function genPassword(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ', b = 'abcdefghijkmnpqrstuvwxyz', n = '23456789', s = '!$#%';
  const pick = (set: string, k: number) => Array.from({ length: k }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return pick(a, 2) + pick(s, 1) + pick(n, 2) + pick(b, 4) + pick(n, 1);
}

/**
 * Provision a customer account carried at NinjaTrader Clearing plus a zeroed cash-balance
 * snapshot. Shared by the partner AOP route, customer /app, and back-office /admin so every
 * path issues an identical account. New accounts start inactive + pending_funding; funding
 * activates them (mirrors the AOP "fund -> activate" step).
 */
export interface IssueOpts { legalStatus?: string; nickname?: string; active?: boolean; primary?: boolean; }
export async function issueAccount(user: Row, opts: IssueOpts = {}): Promise<Row> {
  const id = await nextAccountId();
  const legalStatus = opts.legalStatus || 'Individual';
  const acct = await store.insert('Accounts', {
    id, name: `TAL-${id}`, userId: user.id, accountType: 'Customer', active: Boolean(opts.active),
    clearingHouse: 'NinjaTrader Clearing, LLC', riskCategoryId: 1, autoLiqProfileId: 2,
    marginAccountType: 'Speculator', legalStatus, archived: false,
    nickname: opts.nickname || `${user.firstName || user.name} — ${legalStatus}`,
    ownerEmail: user.email, platformPassword: genPassword(),
    state: opts.active ? 'active' : 'pending_funding', provisioning: 'provisioned',
    primary: Boolean(opts.primary), openedDate: nowIso().slice(0, 10), timestamp: nowIso(),
  });
  await store.insert('CashBalances', {
    accountId: id, timestamp: nowIso(), tradeDate: tradeDateToday(), currencyId: 1,
    cashBalance: 0, realizedPnL: 0, weekRealizedPnL: 0, netLiq: 0, openPnL: 0,
    totalCashValue: 0, initialMargin: 0, maintenanceMargin: 0, availableForTrading: 0,
  });
  return acct;
}

/**
 * Find-or-create the applicant's user and issue their account from an approved application.
 * Shared by the partner AOP approve route and the back-office approve action.
 */
export async function provisionFromApplication(app: Row): Promise<{ user: Row; acct: Row }> {
  let user: Row | null = await store.findOne('OrgUsers', { email: String(app.applicantEmail) });
  if (!user) {
    const nm = String(app.applicantName || '').trim().split(/\s+/);
    user = await store.insert('OrgUsers', {
      name: String(app.applicantEmail).split('@')[0], email: app.applicantEmail,
      firstName: nm[0] || '', lastName: nm.slice(1).join(' ') || '', userStatus: 'Active',
      organizationId: 5012, roles: 'Trader', professionalStatus: 'NonProfessional', timestamp: nowIso(),
    });
  }
  const acct = await issueAccount(user, { legalStatus: String(app.legalStatus), nickname: `${app.applicantEmail} — ${app.legalStatus}` });
  return { user, acct };
}

export async function ownedAccount(claims: Claims | null, id: unknown): Promise<{ acct?: Row; error?: string }> {
  if (!claims || !claims.email) return { error: 'Not your account.' };
  const acct = await store.getById('Accounts', id);
  if (!acct) return { error: 'Account not found.' };
  if (String(acct.ownerEmail) !== String(claims.email)) return { error: 'Not your account.' };
  return { acct };
}
