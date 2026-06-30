# Talero — NT Connect API service

TypeScript Node service for **Talero** (introducing-broker front end under MyFundedFutures). It
clones the **NT Connect (Tradovate-based) `/v1`** partner contract and adds an `/app` layer for the
customer web app. Modular, **zero runtime dependencies**, containerized for Kubernetes.

> **Sandbox.** Data is mock and the partner integration is simulated — safe for internal dev/demo.
> A real, money-handling brokerage additionally needs the live NT Connect partner agreement,
> KYC/AML, customer-fund segregation, and SOC 2. Do not point this at real customer money as-is.

## Stack
TypeScript · Node 22 (built-ins only) · `node:test` · ESLint + Prettier · Docker · Helm (Dev/Staging/Prod) · GitHub Actions CI/CD. Frontend in `public/` (static today; Next.js is the planned direction).

## Quick start
```bash
npm install        # dev tooling (typescript, types, eslint, prettier)
npm run build      # tsc -> dist/
npm start          # node dist/server.js  ->  http://localhost:8787
npm test           # build + node:test (26 tests)
npm run coverage   # + line/branch/function coverage
npm run lint       # eslint
```
Local demo login: `jordan.castillo@example.com` / `TaleroDemo1!`. New sign-ups need an 8+ char password.

## Project structure
```
src/
  config/      typed env + .env loader + prod-secret enforcement
  lib/         http, token (HS256), password (scrypt), lock, time
  middleware/  auth (requireAuth / requireCustomer)
  services/    accounts, validation
  store/       index (selector) -> localStore | sheetsStore  [postgres next]
  routes/      meta, auth, users, accounting, positions, funds, risk, applications, market, app
  router.ts    route table
  app.ts       dispatcher (CORS, static, /app gate, error boundary)
  server.ts    entrypoint + test export surface
tests/         node:test suite (HTTP-level)
deploy/helm/   Helm chart + values-{dev,staging,prod}
docs/          ARCHITECTURE.md, openapi.yaml
.github/workflows/  ci.yml, deploy.yml
Dockerfile     multi-stage; runtime image has no node_modules
```
See `docs/ARCHITECTURE.md` for the request flow and design decisions, and `docs/openapi.yaml` for the API.

## Configuration (env)
| Var | Purpose |
|---|---|
| `PORT` | listen port (default 8787) |
| `NODE_ENV` | `production` enforces real secrets (no sandbox fallbacks) |
| `NTC_ENV` | label: demo / staging / prod |
| `DATA_BACKEND` | `local` (JSON) or `sheets` (Google Sheets) |
| `TOKEN_SECRET` | **required in production** — JWT signing secret |
| `TALERO_PARTNER_SECRET` | **required in production** — partner API secret (cid 80432) |
| `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`/`_FILE` | for the Sheets backend |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in (unset = sandbox simulator) |

## Deploy
- **Docker:** `docker build -t talero . && docker run -p 8787:8787 -e TOKEN_SECRET=... -e TALERO_PARTNER_SECRET=... talero`
- **Kubernetes:** `helm upgrade --install talero deploy/helm/talero -f deploy/helm/talero/values-prod.yaml` (create the `talero-secrets` Secret first).
- **CI/CD:** PRs run build + lint + tests + coverage; pushes to `main` build/push the image and `helm upgrade` Dev → Staging → Prod (Staging/Prod gated by GitHub Environment approvals).
- **Render (sandbox):** `render.yaml` blueprint, still live.

## Testing & audit
`node:test` hits the HTTP surface, so it survives refactors. The repo also ships a coverage/production-readiness audit agent at `.claude/agents/coverage-auditor.md` — run it before releases.
