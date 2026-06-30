import * as fs from 'fs';
import * as path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { PUBLIC_DIR } from '../config';

export function send(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...extraHeaders,
  });
  res.end(payload);
}
export function fail(res: ServerResponse, status: number, text: string): void {
  send(res, status, { errorText: text });
}

export function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('application/x-www-form-urlencoded')) return resolve(Object.fromEntries(new URLSearchParams(data)));
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
  '.webp': 'image/webp', '.gif': 'image/gif',
};

export function serveStatic(res: ServerResponse, relPath: string): boolean {
  try {
    const rel = decodeURIComponent(relPath).replace(/^\/+/, '');
    const full = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!full.startsWith(PUBLIC_DIR)) return false;
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*',
    });
    res.end(fs.readFileSync(full));
    return true;
  } catch { return false; }
}
export function redirect(res: ServerResponse, url: string): void {
  res.writeHead(302, { Location: url });
  res.end();
}
export function serveSpa(res: ServerResponse): void {
  if (!serveStatic(res, 'index.html')) { res.writeHead(500); res.end('index.html missing'); }
}
