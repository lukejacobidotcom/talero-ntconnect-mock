import { store } from '../store';
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

export async function ownedAccount(claims: Claims | null, id: unknown): Promise<{ acct?: Row; error?: string }> {
  if (!claims || !claims.email) return { error: 'Not your account.' };
  const acct = await store.getById('Accounts', id);
  if (!acct) return { error: 'Account not found.' };
  if (String(acct.ownerEmail) !== String(claims.email)) return { error: 'Not your account.' };
  return { acct };
}
