# Talero Platform — Engineering Overview

Talero is our futures brokerage front end under MyFundedFutures. It introduces accounts to **NinjaTrader Clearing** (the FCM) and mirrors the **NT Connect (Tradovate-based) partner API**. Today it runs as a fully working **sandbox**: real UI, real auth, real account lifecycle, with mock data and a simulated clearing integration. It is structured so the same surface flips to live once the NT Connect partner agreement and credentials land, with no rewrite.

## Stack
- **Language:** TypeScript (strict mode), Node 22, **zero runtime dependencies** (built-ins only)
- **Tests:** `node:test` at the HTTP layer, plus coverage
- **Lint / format:** ESLint + Prettier
- **Container:** multi-stage Docker (runtime image ships no `node_modules`)
- **Orchestration:** Helm chart with Dev / Staging / Prod values
- **CI/CD:** GitHub Actions (build, lint, test, coverage on PR; build image and `helm upgrade` Dev to Staging to Prod on main)
- **Sandbox host:** Render (`render.yaml` blueprint)
- **Frontend:** static app today (auth, dashboard, onboarding, admin); Next.js is the planned direction

## Architecture: three API layers, one core
- **Partner layer (`/v1`):** a faithful clone of the NT Connect contract (Users, Authentication, Accounting, Risks, Funds, Customer Applications, Orders, Positions, Contract Library, Fees). Bearer-token auth on the CID + API-key model.
- **Customer layer (`/app`):** the trader web-app surface (register, login, onboarding/KYC, account, deposit, simulate).
- **Back-office layer (`/admin`):** our ops console API (users, accounts, risk, halts, the application queue, audit log), RBAC-gated.
- **Shared services:** one source of truth for account provisioning, validation, and the AOP/KYC model, so all three layers behave identically.

## Account opening and KYC (AOP)
Modeled on how it actually works in production: **NinjaTrader Clearing owns KYC/AML and the final decision.** Talero collects the application, submits it to NTC's Account Opening Process (AOP) API, and relays the response.

- **Canonical status model** in one shared module: lifecycle (Application Started, KYC Pending, Agreements Pending, Awaiting Funding, Active, Rejected), KYC status (Pending Review, Verified, Action Required), and the AOP API response.
- **Deterministic decision engine:** restricted jurisdiction returns Rejected; missing CIP documents return Documents Required; incomplete agreements return Agreements Pending; a clean file is Verified and issues a pending-funding account. First deposit activates it.
- **Compliance-safe by construction:** rejection reasons are written to the audit log for ops only and are never returned to the client (the client sees "not approved, contact support" and nothing more).
- **Wired end to end:** a working 5-step onboarding page (Application, Identity/CIP, Suitability, Agreements, Review) posts to the live API; the ops queue can approve, reject, request documents, and resubmit, each action audit-logged.

## Auth, safety, trust
- **Sessions:** signed JWTs (HS256); passwords hashed with scrypt
- **Access control:** partner tokens, customer scope, and admin RBAC are separate and enforced. Partner tokens cannot touch customer endpoints and vice versa.
- **Money safety:** per-account async locks prevent double-spend races; idempotency keys make deposits safe to retry
- **Audit:** append-only event log on every state change (funds, risk, account, application)
- **Secrets:** production refuses to boot on fallback secrets; real keys only via env; service-account and OAuth secrets are gitignored
- **Social sign-in:** Google OAuth 2.0 / OIDC with signed-state CSRF protection, plus a sandbox simulator when no client is configured

## Data layer
A single `Datastore` interface with three interchangeable backends: local JSON (dev), Google Sheets (current demo), and Postgres (next, drops in without touching routes).

## Observability
Structured JSON logs with per-request IDs, and a Prometheus `/metrics` endpoint.

## Status (honest)
This is a **sandbox** with mock data and a simulated clearing integration, safe for internal dev and demos. Going live additionally needs the NT Connect partner agreement and credentials, live KYC/AML through NTC, customer-fund segregation, and SOC 2. The architecture is built to flip to live without a rewrite.
