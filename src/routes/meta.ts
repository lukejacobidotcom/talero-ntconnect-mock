import { route, getRoutes } from '../router';
import { send, fail, serveStatic, serveSpa } from '../lib/http';
import { nowIso } from '../lib/time';
import { ENV_LABEL } from '../config';
import { store } from '../store';

route('GET', '/', async (_req, res) => serveSpa(res));
route('GET', '/auth', async (_req, res) => { if (!serveStatic(res, 'auth.html')) fail(res, 404, 'auth.html missing'); });
route('GET', '/dashboard', async (_req, res) => { if (!serveStatic(res, 'dashboard.html')) fail(res, 404, 'dashboard.html missing'); });
route('GET', '/healthz', async (_req, res) => send(res, 200, { service: 'Talero NT Connect mock', env: ENV_LABEL, backend: store.backend, health: 'ok' }));
route('GET', '/v1', async (_req, res) => send(res, 200, {
  resourceGroups: ['Get Timestamp', 'OIDC User Info', 'Users', 'Authentication', 'Accounting', 'Risks', 'Funds', 'Configuration', 'Alerts', 'Customer Applications', 'Orders', 'Contract Library', 'Personal Info', 'Fees', 'Positions'],
  endpoints: getRoutes().filter((r) => r.path.startsWith('/v1')).map((r) => `${r.method} ${r.path}`),
}));
route('GET', '/v1/timestamp', async (_req, res) => send(res, 200, { timestamp: nowIso() }));
