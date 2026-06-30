import * as crypto from 'crypto';
import * as fs from 'fs';
import type { Datastore, Row } from '../types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEET_ID = process.env.SHEET_ID || '';

function b64url(buf: crypto.BinaryLike): string {
  return Buffer.from(buf as Buffer).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function loadServiceAccount(): { client_email: string; private_key: string } {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw && process.env.GOOGLE_SERVICE_ACCOUNT_FILE) raw = fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8');
  if (!raw) throw new Error('Sheets backend selected but no service-account credentials provided.');
  if (!raw.trim().startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(raw);
}

let tok: { value: string | null; exp: number } = { value: null, exp: 0 };
async function accessToken(): Promise<string> {
  if (tok.value && Date.now() < tok.exp - 60000) return tok.value;
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
  });
  if (!res.ok) throw new Error('Google token request failed: ' + (await res.text()));
  const j = await res.json() as { access_token: string; expires_in: number };
  tok = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function apiGet(range: string): Promise<string[][]> {
  const t = await accessToken();
  const res = await fetch(`${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error('Sheets read failed: ' + (await res.text()));
  return ((await res.json()) as { values?: string[][] }).values || [];
}
async function apiAppend(tab: string, row: unknown[]): Promise<void> {
  const t = await accessToken();
  const res = await fetch(`${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(tab + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
  if (!res.ok) throw new Error('Sheets append failed: ' + (await res.text()));
}
async function apiUpdate(tab: string, rowIndex: number, row: unknown[]): Promise<void> {
  const t = await accessToken();
  const res = await fetch(`${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(`${tab}!A${rowIndex}`)}?valueInputOption=RAW`,
    { method: 'PUT', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
  if (!res.ok) throw new Error('Sheets update failed: ' + (await res.text()));
}

function coerce(v: string): unknown {
  if (v === '' || v == null) return '';
  if (v === 'TRUE') return true;
  if (v === 'FALSE') return false;
  const s = String(v).trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) { try { return JSON.parse(s); } catch { return v; } }
  if (s !== '' && !isNaN(Number(s)) && /^-?\d/.test(s)) return Number(s);
  return v;
}
function cell(v: unknown): unknown {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

const headerCache: Record<string, string[]> = {};
async function headers(tab: string): Promise<string[]> {
  if (headerCache[tab]) return headerCache[tab];
  const r = await apiGet(`${tab}!1:1`);
  headerCache[tab] = r[0] || [];
  return headerCache[tab];
}
async function readTab(tab: string): Promise<{ head: string[]; rows: Array<Row & { __row: number }> }> {
  const values = await apiGet(`${tab}!A1:ZZ`);
  if (!values.length) return { head: [], rows: [] };
  const head = values[0];
  headerCache[tab] = head;
  const rows = values.slice(1).map((arr, i) => {
    const obj: Row & { __row: number } = { __row: i + 2 };
    head.forEach((h, c) => { obj[h] = coerce(arr[c]); });
    return obj;
  });
  return { head, rows };
}

export const store: Datastore = {
  backend: 'sheets',
  async list(table, where) {
    const { rows } = await readTab(table);
    let out: Row[] = rows.map(({ __row, ...r }) => r);
    if (where) out = out.filter((r) => Object.keys(where).every((k) => String(r[k]) === String(where[k])));
    return out;
  },
  async getById(table, id) {
    const { rows } = await readTab(table);
    const r = rows.find((x) => String(x.id) === String(id));
    if (!r) return null;
    const { __row, ...rest } = r;
    return rest;
  },
  async findOne(table, where) { return (await this.list(table, where))[0] || null; },
  async insert(table, obj) {
    const head = await headers(table);
    const { rows } = await readTab(table);
    if (obj.id == null) obj.id = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
    await apiAppend(table, head.map((h) => cell(obj[h])));
    return obj;
  },
  async update(table, id, patch) {
    const { head, rows } = await readTab(table);
    const r = rows.find((x) => String(x.id) === String(id));
    if (!r) return null;
    const merged: Row & { __row?: number } = { ...r, ...patch };
    const rowIndex = r.__row;
    delete merged.__row;
    await apiUpdate(table, rowIndex, head.map((h) => cell(merged[h])));
    return merged;
  },
  async meta() { return {}; },
  async reset() { throw new Error('reset is not supported on the Sheets backend'); },
};
