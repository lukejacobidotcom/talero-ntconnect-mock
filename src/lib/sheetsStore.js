'use strict';
// Google Sheets datastore adapter. Same interface as localStore.
// Auth: Google service account, RS256 JWT -> OAuth2 access token (zero npm deps).
// Each NT Connect resource group == one tab. Row 1 = headers (column = JSON field).
//
// Required env:
//   SHEET_ID                       the spreadsheet id (from its URL)
//   GOOGLE_SERVICE_ACCOUNT_JSON    full service-account JSON (string or base64), OR
//   GOOGLE_SERVICE_ACCOUNT_FILE    path to the service-account JSON file
//
// The service account's client_email must be shared (Editor) on the sheet.

const crypto = require('crypto');
const fs = require('fs');

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function loadServiceAccount() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw && process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    raw = fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8');
  }
  if (!raw) throw new Error('Sheets backend selected but no service-account credentials provided.');
  if (!raw.trim().startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(raw);
}

let _tok = { value: null, exp: 0 };
async function accessToken() {
  if (_tok.value && Date.now() < _tok.exp - 60000) return _tok.value;
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claim}.${sig}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion
    })
  });
  if (!res.ok) throw new Error('Google token request failed: ' + (await res.text()));
  const j = await res.json();
  _tok = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return _tok.value;
}

const SHEET_ID = process.env.SHEET_ID;

async function apiGet(range) {
  const tok = await accessToken();
  const res = await fetch(`${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${tok}` }
  });
  if (!res.ok) throw new Error('Sheets read failed: ' + (await res.text()));
  return (await res.json()).values || [];
}

async function apiAppend(tab, row) {
  const tok = await accessToken();
  const res = await fetch(
    `${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(tab + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }) }
  );
  if (!res.ok) throw new Error('Sheets append failed: ' + (await res.text()));
}

async function apiUpdate(tab, rowIndex1Based, row) {
  const tok = await accessToken();
  const range = `${tab}!A${rowIndex1Based}`;
  const res = await fetch(
    `${SHEETS_API}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }) }
  );
  if (!res.ok) throw new Error('Sheets update failed: ' + (await res.text()));
}

function coerce(v) {
  if (v === '' || v == null) return '';
  if (v === 'TRUE') return true;
  if (v === 'FALSE') return false;
  const s = String(v).trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try { return JSON.parse(s); } catch (_) { return v; }
  }
  if (s !== '' && !isNaN(Number(s)) && /^-?\d/.test(s)) return Number(s);
  return v;
}

function cell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// Lightweight per-process cache of header order per tab.
const _headers = {};
async function headers(tab) {
  if (_headers[tab]) return _headers[tab];
  const rows = await apiGet(`${tab}!1:1`);
  _headers[tab] = rows[0] || [];
  return _headers[tab];
}

async function readTab(tab) {
  const values = await apiGet(`${tab}!A1:ZZ`);
  if (!values.length) return { head: [], rows: [] };
  const head = values[0];
  _headers[tab] = head;
  const rows = values.slice(1).map((arr, i) => {
    const obj = { __row: i + 2 };
    head.forEach((h, c) => { obj[h] = coerce(arr[c]); });
    return obj;
  });
  return { head, rows };
}

const api = {
  backend: 'sheets',

  async list(table, where) {
    const { rows } = await readTab(table);
    let out = rows.map(({ __row, ...r }) => r);
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

  async findOne(table, where) {
    const rows = await api.list(table, where);
    return rows[0] || null;
  },

  async insert(table, obj) {
    const head = await headers(table);
    const { rows } = await readTab(table);
    if (obj.id == null) {
      const max = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      obj.id = max + 1;
    }
    await apiAppend(table, head.map((h) => cell(obj[h])));
    return obj;
  },

  async update(table, id, patch) {
    const { head, rows } = await readTab(table);
    const r = rows.find((x) => String(x.id) === String(id));
    if (!r) return null;
    const merged = { ...r, ...patch };
    delete merged.__row;
    await apiUpdate(table, r.__row, head.map((h) => cell(merged[h])));
    return merged;
  },

  async meta() { return {}; },
  async reset() { throw new Error('reset is not supported on the Sheets backend'); }
};

module.exports = { store: api };
