import * as http from 'http';
import { PORT, ENV_LABEL } from './config';
import { getRoutes } from './router';
import { send, fail, readBody, serveStatic, serveSpa } from './lib/http';
import { requireCustomer } from './middleware/auth';
import { store } from './store';
import { log, reqId } from './lib/logger';
import * as metrics from './lib/metrics';

// Register all routes (side-effect imports).
import './routes/meta';
import './routes/auth';
import './routes/users';
import './routes/accounting';
import './routes/positions';
import './routes/funds';
import './routes/risk';
import './routes/applications';
import './routes/market';
import './routes/app';
import './routes/oauth';
import './routes/admin';

export const server = http.createServer(async (req, res) => {
  const rid = reqId();
  const t0 = Date.now();
  res.setHeader('X-Request-Id', rid);
  res.on('finish', () => {
    metrics.inc('http_requests_total');
    metrics.inc('http_' + String(res.statusCode)[0] + 'xx');
    log('info', 'req', { id: rid, method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - t0 });
  });
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(url.searchParams.entries());
  const match = getRoutes().find((r) => r.method === req.method && r.path === path);
  if (!match) {
    if (req.method === 'GET' && !path.startsWith('/v1') && !path.startsWith('/app')) {
      if (serveStatic(res, path === '/' ? 'index.html' : path)) return;
      if (!path.includes('.')) return serveSpa(res);
      return fail(res, 404, 'Not found: ' + path);
    }
    return fail(res, 404, `No route ${req.method} ${path}`);
  }
  if (path.startsWith('/app/') && path !== '/app/register' && path !== '/app/login') {
    if (!requireCustomer(req, res)) return;
  }
  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    await match.handler(req, res, { query, body });
  } catch (e) {
    console.error('[error]', e);
    fail(res, 500, 'Internal mock error: ' + (e as Error).message);
  }
});

export function start(port?: number): Promise<http.Server> {
  return new Promise((resolve) => {
    server.listen(port == null ? PORT : port, () => {
      const addr = server.address();
      const p = typeof addr === 'object' && addr ? addr.port : port;
      if (process.env.NODE_ENV !== 'test') console.log(`Talero NT Connect mock listening on :${p}  (env=${ENV_LABEL}, backend=${store.backend})`);
      resolve(server);
    });
  });
}
