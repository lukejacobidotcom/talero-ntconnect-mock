'use strict';
// Minimal HS256 JWT (access tokens), built on Node crypto. No npm deps.
const crypto = require('crypto');

const SECRET = process.env.TOKEN_SECRET || 'talero-ntconnect-mock-dev-secret-change-me';

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }
function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function sign(payload, ttlSeconds = 4800) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = b64urlJson(header);
  const claim = b64urlJson(body);
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${claim}`).digest());
  return { token: `${head}.${claim}.${sig}`, exp: body.exp };
}

function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, claim, sig] = parts;
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(`${head}.${claim}`).digest());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let body;
  try { body = JSON.parse(fromB64url(claim)); } catch (_) { return null; }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}

module.exports = { sign, verify };
