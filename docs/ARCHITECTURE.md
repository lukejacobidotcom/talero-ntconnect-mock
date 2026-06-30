# Talero — Architecture

Talero is the introducing-broker front end + API. This service is a **TypeScript, dependency-free
Node HTTP server** that clones the NT Connect (Tradovate-based) `/v1` partner contract, plus an
`/app` layer for the customer web app. It runs on a pluggable datastore and is containerized for
Kubernetes (Dev / Staging / Prod).

> Sandbox status: data is mock and the partner integration is simulated. A real brokerage also
> requires the live NT Connect partner agreement, KYC/AML, fund segregation, and SOC 2 — tracked
> outside this repo.

## Module layout (`src/`)

| Path | Responsibility |
|---|---|
| `config/` | Typed env/config, `.env` loader, path resolution, prod-secret enforcement |
| `lib/` | Framework-free primitives: `http` (send/serveStatic), `token` (HS256), `password` (scrypt), `lock` (per-key mutex), `time` |
| `middleware/` | `auth` — `requireAuth` (partner) and `requireCustomer` (app session) |
| `services/` | `accounts` (id allocation, ownership), `validation` (email/amount) |
| `store/` | Datastore abstraction: `index` (selector) → `localStore` (JSON) / `sheetsStore` (Google Sheets); Postgres adapter is the planned next driver |
| `routes/` | One module per NT Connect resource group (`auth`, `accounting`, `funds`, `risk`, `applications`, `market`, `users`, `positions`) + `app` (customer) + `meta` |
| `router.ts` | Tiny route table (`route()` / `getRoutes()`) |
| `app.ts` | HTTP server + dispatcher (CORS, static, `/app` customer gate, error boundary) |
| `server.ts` | Entrypoint (`start()`); also the test/export surface |

## Request flow
`http request → app.ts dispatcher → (static? serve) → match route → /app gate (requireCustomer) → handler → store → JSON`

## Key decisions
- **Datastore behind one interface** (`Datastore` in `types.ts`) so local/Sheets/Postgres are swappable with no route changes.
- **Money safety:** all balance read-modify-write runs inside `withLock(accountId)` so concurrent deposits/trades can't lose or double funds. (Single-process; multi-replica must move to a DB row lock — the Postgres driver's job.)
- **Auth:** partner tokens (`/v1`) and customer sessions (`/app`, scope `app.customer`) are distinct; the dispatcher gates `/app/*` and `ownedAccount` fails closed.
- **No insecure prod defaults:** in `NODE_ENV=production` the server refuses to boot without `TOKEN_SECRET` and `TALERO_PARTNER_SECRET`.
- **Zero runtime dependencies:** only Node built-ins → tiny container, fast cold start, small attack surface. TypeScript + tooling are dev-only.

## Deploy
- **Container:** multi-stage `Dockerfile` (build TS → runtime image with no node_modules).
- **Kubernetes:** Helm chart in `deploy/helm/talero` with `values-{dev,staging,prod}.yaml` (replicas, autoscaling, ingress host, env mode). Secrets come from a k8s Secret (`talero-secrets`).
- **CI/CD:** `.github/workflows/ci.yml` (build + lint + tests + coverage on every PR) and `deploy.yml` (build/push image → `helm upgrade` Dev → Staging → Prod with gated promotion).
- **Render:** `render.yaml` remains for the current sandbox demo.
