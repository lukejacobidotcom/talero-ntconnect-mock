# Talero NT Connect Mock — Coverage & Production-Readiness Audit (Re-Audit)

**Date:** 2026-06-29 (re-audit after Phase 1 fixes)
**Prior audit:** 2026-06-29 (initial)
**Auditor:** coverage-auditor agent
**Verdict:** NOT PRODUCTION READY. Phase 1 closed 4 of 7 blockers and 1 of 8 high findings. Three blockers remain open (B2, B3, and a partial B1). Real customer money must not flow until all blockers are resolved.

---

## Before / After Score

| Severity | Prior | Now | Delta |
|---|---|---|---|
| **Blocker** | 7 | 3 | −4 |
| **High** | 8 | 7 | −1 |
| **Medium** | 8 | 8 | 0 |
| **Low** | 6 | 6 | 0 |

---

## Coverage Table (real numbers from `npm run coverage`)

| File | Line % | Branch % | Funcs % | Uncovered Lines |
|---|---|---|---|---|
| scripts/reset.js | 100.00 | 50.00 | 100.00 | — |
| src/lib/localStore.js | 88.04 | 66.67 | 85.71 | 22–27, 81, 86–89 |
| src/lib/lock.js | 100.00 | 87.50 | 100.00 | — |
| src/lib/password.js | 100.00 | **37.50** | 100.00 | — (branches: verify's malformed-stored and catch path not exercised) |
| src/lib/store.js | 61.90 | 33.33 | 100.00 | 8–15 |
| src/lib/sheetsStore.js | 0.00 | 0.00 | 0.00 | (entire file) |
| src/lib/token.js | 100.00 | 75.00 | 100.00 | — |
| src/server.js | 93.37 | 52.28 | 89.66 | 226–228, 278–280, 340–364, 439, 458–459, 462–464, 694–699, 726–727, 735–737, 745–746 |
| tests/api.test.js | 100.00 | 97.30 | 97.06 | — |
| **All files** | **93.70** | **58.87** | **91.84** | |

**Test run:** 25 pass / 0 fail / 0 skip (up from 20 pass)

**Coverage change:** Line 92.66% → 93.70% (+1.04pp). Branch 54.71% → 58.87% (+4.16pp). Five new tests added for B4/B5/B6/H7/B7.

**Remaining critical coverage gap:** `src/lib/sheetsStore.js` still 0% — the production datastore adapter is completely untested. Branch coverage on `src/lib/password.js` is 37.50% despite 100% line coverage — the malformed-stored-hash path and catch branch in `verify()` are never hit.

---

## Phase 1 Fixes Verified

### FIXED — B4: `/app/login` now verifies scrypt password hash
- `src/lib/password.js` — new file. Exports `hash(pw)` (scrypt + random 16-byte salt, format `scrypt$<saltHex>$<hashHex>`) and `verify(pw, stored)` (timing-safe compare via `crypto.timingSafeEqual`). No npm deps.
- `src/server.js:34` — `const password = require('./lib/password');` imported at top of server.
- `src/server.js:573–576` — login handler: validates `isEmail(email) && b.password`, fetches user, calls `password.verify(b.password, user.passwordHash)`, returns 401 on mismatch. No session token issued without correct password.
- `src/server.js:564` — register stores `passwordHash: password.hash(b.password)` — plaintext never persisted.
- `src/server.js:567, 580, 587` — `safe` copies delete `safe.passwordHash` before every API response.
- **Test:** test 21 (`blocker B4/B5: wrong password 401, existing email 409`) — confirms 401 on wrong password.
- **Test:** test 22 (`seeded user logs in with demo password`) — confirms seed users have valid scrypt hashes (`data/seed.json:68,81,94,107`).

### FIXED — B5: `/app/register` returns 409 for existing email
- `src/server.js:560–562` — `store.findOne('OrgUsers', { email })` — if found, `return fail(res, 409, 'An account with that email already exists. Please sign in.')`. No session token returned.
- **Test:** test 21 confirms 409 status.

### FIXED — B6: Money mutations inside `withLock`
- `src/lib/lock.js` — new file. Per-key async mutex using chained Promises (`prev.then(() => fn()).finally(() => release())`). Single-process safe. Multi-instance requires DB-level locking (documented in the file).
- `src/server.js:35` — `const { withLock } = require('./lib/lock');` imported.
- `src/server.js:642–658` — `/app/account/deposit`: the entire read-modify-write (`store.list('CashBalances')` → arithmetic → `store.update(...)`) is inside `await withLock(acct.id, async () => { ... })`.
- `src/server.js:689` — `/app/account/simulate`: balance read-modify-write inside `await withLock(acct.id, async () => { ... })`.
- **Test:** test 25 (`blocker B6: concurrent deposits do not lose money`) — fires 5 simultaneous deposits of $1000, asserts final balance is exactly $5000. Passes.

### FIXED — H7: `ownedAccount` rejects when `claims.email` absent
- `src/server.js:594` — `if (!claims || !claims.email) return { error: 'Not your account.' };` — guard now fails closed. Partner tokens (no `email` claim) cannot reach any `/app/account/*` handler.
- `src/server.js:728–730` — dispatcher additionally calls `requireCustomer()` for all `/app/*` except register/login before even reaching the route handler. `requireCustomer` checks `claims.email` AND `scopes` must match `app.customer` (`src/server.js:109–115`).
- **Test:** test 23 (`blocker H7: partner token rejected from /app`) — confirms 403.

### FIXED — B7: `/v1/funds/deposit` and `/v1/funds/withdraw` validate positive amount
- `src/server.js:404` — `/v1/funds/deposit`: `if (!b.accountId || validAmount(b.amount) == null) return fail(res, 400, ...)`.
- `src/server.js:415` — `/v1/funds/withdraw`: same guard.
- `src/server.js:119` — `validAmount(v)` — `Number.isFinite(n) && n > 0` — rejects zero, negative, NaN, and string.
- **Test:** test 24 (`deposit rejects non-positive / NaN amount`) — confirms 400 for 0, −50, "abc", and missing amount.

### PARTIAL — B1: Secrets removed from seed.json but still hardcoded in server.js
- `data/seed.json` — no `apiKey` or `orgAdminPassword` literals. `ApiKeys` table is now empty (`[]`) in the seed. OrgUsers now store scrypt hashes instead of plaintext passwords.
- **Still open:** `src/server.js:41` — `const SANDBOX_PARTNER_SECRET = 'ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5';` — the demo API key is still hardcoded as a fallback constant in the server source. Anyone with repo access has this credential. The comment on line 40 warns it must be replaced, but a warning is not a fix.
- `src/server.js:177` — auth handler: `process.env[key.secretEnv] || (key.environment === 'demo' ? SANDBOX_PARTNER_SECRET : null)` — the fallback to the hardcoded constant is live code.

### STILL OPEN — B2: JWT secret fallback is still in code
- `src/lib/token.js:5` — `const SECRET = process.env.TOKEN_SECRET || 'talero-ntconnect-mock-dev-secret-change-me';` — fallback string is still present. If `TOKEN_SECRET` is unset in production, all tokens are trivially forgeable.
- `.env:4` — `TOKEN_SECRET=change-me-to-a-long-random-string` — the sample value is not a real secret and will be reused if `.env` is copied as-is.
- Fix required: remove the fallback string; throw at startup if `TOKEN_SECRET` is missing or fewer than 32 characters.

### STILL OPEN — B3: GCP service-account key file still exists in repo
- `talero-ninja-api-77e163ccb986.json` — file is present at repo root.
- `.gitignore:5` — `talero-ninja-api-*.json` is now listed, which prevents *future* commits of matching files. But `.gitignore` does not remove already-tracked files from git history. If this file was ever committed (which it was, given the prior audit found it), the private key is in git history permanently until `git filter-repo` is run.
- Fix required: verify `git log --all --full-history -- talero-ninja-api-77e163ccb986.json` to confirm whether it was tracked; if so, purge history and rotate the GCP service account key.

---

## Still-Open Blockers (Phase 2 must address)

### B1-PARTIAL. Hardcoded partner API key fallback remains in server source
- Evidence: `src/server.js:41` — `const SANDBOX_PARTNER_SECRET = 'ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5'`; `src/server.js:177` — actively used as fallback.
- Risk: Repo access = partner credential. If the demo key is ever reused for a live NT Connect environment it is compromised at rest.
- Fix: Replace with `process.env.TALERO_PARTNER_SECRET` only; throw at startup if unset in non-demo environments. For sandbox/CI, use a test-only value in `.env.test`.

### B2. JWT secret fallback still present
- Evidence: `src/lib/token.js:5` — plaintext fallback string.
- Risk: A deployment without `TOKEN_SECRET` set issues tokens anyone can forge. The `.env` sample value will be reused by anyone who copies it verbatim.
- Fix: Remove fallback entirely. Add startup guard: `if (!process.env.TOKEN_SECRET || process.env.TOKEN_SECRET.length < 32) { console.error('TOKEN_SECRET is not set or too short'); process.exit(1); }`.

### B3. GCP service-account private key file in repo
- Evidence: `talero-ninja-api-77e163ccb986.json` at repo root. `.gitignore` now lists it but cannot retroactively remove history.
- Risk: If tracked in any prior commit, the private key is permanently readable by anyone with git history access. The key grants Editor access to the Sheets datastore.
- Fix: Run `git log --all -- talero-ninja-api-77e163ccb986.json` to check tracking history. If found, run `git filter-repo --path talero-ninja-api-77e163ccb986.json --invert-paths`, force-push all branches, and immediately rotate the GCP service account key in Google Cloud Console.

---

## High Findings — All Still Open (Phase 2+)

**H1. Google Sheets adapter has 0% test coverage**
- Evidence: `src/lib/sheetsStore.js` — 0% line/branch/function. `src/lib/store.js:8–15` — Sheets branch uncovered.
- Risk: All money/auth logic is untested against the actual production backend. Silent data corruption under Sheets would not be caught.
- Fix: Add tests that mock `fetch` and exercise every `sheetsStore` method. Target: >80% branch coverage.

**H2. CORS wildcard on all routes including authenticated money endpoints**
- Evidence: `src/server.js:75–76` — `'Access-Control-Allow-Origin': '*'` on every `send()`.
- Risk: Any website can make credentialed cross-origin requests to all API endpoints.
- Fix: Replace `*` with an explicit origin allowlist; restrict to `/app` routes only (partner `/v1` is server-to-server).

**H3. No rate limiting on auth or money endpoints**
- Evidence: `src/server.js` — no rate-limit middleware anywhere; no npm dependencies for it.
- Risk: Unrestricted brute-force against `/app/login`, `/app/register`, `/v1/auth/accesstokenrequest`.
- Fix: Per-IP token bucket — 10 req/min on auth, 5 req/min on deposit/withdraw.

**H4. No request-size limit below 5 MB; `req.destroy()` sends no 413**
- Evidence: `src/server.js:87` — `if (data.length > 5e6) req.destroy()` — no 413 response, connection left dangling.
- Risk: Slow-loris style slow large uploads; client hangs; potential socket leak.
- Fix: Lower limit to 64 KB; `fail(res, 413, 'Request too large')` then destroy.

**H5. Invalid JSON body silently treated as `{}`**
- Evidence: `src/server.js:90` — `catch (_) { resolve({}); }`.
- Risk: Malformed JSON produces misleading field-level errors rather than 400.
- Fix: Return `fail(res, 400, 'Invalid JSON')` instead of resolving empty.

**H6. `platformPassword` returned in plaintext in all account list/item responses**
- Evidence: `src/server.js:289–309` (`/v1/account/create`), `/v1/account/list` response includes all fields.
- Risk: Any partner JWT can harvest all customer trading passwords via `GET /v1/account/list`.
- Fix: Strip `platformPassword` from all list/item responses; return it only once at account creation; store a hash.

**H8. Sheets `_headers` cache is process-global and never invalidated**
- Evidence: `src/lib/sheetsStore.js:112–117` — `const _headers = {}` — module-level, never expires.
- Risk: Column-order changes after process start silently write values into wrong columns.
- Fix: Add a 5-minute TTL or invalidate on each write.

**NEW: H9. `password.js` branch coverage 37.50% — malformed-hash and catch paths untested**
- Evidence: coverage report — `src/lib/password.js` branch 37.50%. The `verify()` function's branches for malformed `stored` (parts.length !== 3, parts[0] !== 'scrypt') and the `catch` path (invalid hex, scrypt error) are never exercised by tests.
- Risk: A stored password in an unexpected format (e.g. legacy plaintext, truncated record) would silently return `false` without exercising the guard — the code is correct but the guards are unverified.
- Fix: Add unit tests for `verify(pw, 'notascryptstring')`, `verify(pw, 'scrypt$bad$hash')`, and `verify(pw, null)`. These are fast synchronous tests, no server needed.

---

## Medium Findings (unchanged from prior audit)

**M1.** `store.js` Sheets-fallback branch (lines 8–15) untested — silent fallback masks misconfiguration. `src/lib/store.js:8–15`.

**M2.** Missing security headers (no CSP, no X-Frame-Options, no HSTS). `src/server.js:56–60, 71–81`.

**M3.** `nextAccountId()` TOCTOU race — concurrent account creations can produce duplicate IDs. `src/server.js:112–119`.

**M4.** `reset.js` branch coverage 50% — fresh-deploy (no db.json) seed path untested. `scripts/reset.js`.

**M5.** `localStore.reset()` uses `fs.unlinkSync` — can throw EPERM on Windows/OneDrive. `src/lib/localStore.js:86`.

**M6.** No audit trail — deposit/simulate mutate the balance row in place; no append-only transaction log. `src/server.js:625–629, 671–676`.

**M7.** `/app/account/simulate` can drive `cashBalance` negative with no floor. `src/server.js:647, 670`.

**M8.** Sheets backend not health-checked at startup — first-request failure surfaces as 500 in user traffic. `src/lib/store.js:7–14`.

---

## Low Findings (unchanged from prior audit)

**L1.** `token.js` branch 75% — expired-token path untested. `src/lib/token.js:40`.

**L2.** `readBody` on `req.destroy()` hangs response — no 413 sent. `src/server.js:87`.

**L3.** Dead variable `fakeReq = {}` in createbulk handler. `src/server.js:328`.

**L4.** `td-market.jsx` uses hardcoded mock data — no `/v1/quotes` call. `public/td-market.jsx:85–88`.

**L5.** `td-funding.jsx` `submit()` is client-only — no POST to `/app/account/deposit`. `public/td-funding.jsx:199–213`.

**L6.** `start()` function and `require.main` guard untested. `src/server.js:726–746`.

---

## UI vs Endpoint Gap (unchanged)

The following UI pages have no backing server endpoint: td-funding.jsx (deposit/withdraw wizards), td-billing.jsx, td-plans.jsx, td-settings.jsx, td-statements.jsx, td-certificates.jsx, td-market.jsx (live quotes), td-chat.jsx, td-onboarding.jsx (no KYC callback), td-tournaments.jsx, td-platforms.jsx, td-charts.jsx, td-data.jsx.

Working and wired: `/app/register`, `/app/login`, `/app/me`, `/app/account`, `/app/account/open`, `/app/account/deposit`, `/app/account/simulate`.

---

## Regulatory / Integration Gap Note

This codebase remains a **sandbox mock**. No change from prior audit. Real production requires:

1. **NT Connect live credentials** — live partner key, signed IB agreement, CFTC/NFA registration, NinjaTrader compliance approval.
2. **KYC/AML** — onboarding links to `fintevo.com` as placeholder; production requires licensed KYC provider (Jumio, Socure), webhook handling, document storage, SAR/CTR capability.
3. **Customer fund segregation** — mock never moves real money; real FCM requires daily reconciliation of segregated funds.
4. **Payment processing** — ACH/wire/Stripe/Plaid are UI mockups; each requires MSB agreement, NACHA compliance, PCI-DSS.
5. **SOC 2 / security** — no audit logging, no secrets management, no WAF.
6. **Data residency / GDPR** — Sheets store holds PII in US-region; EU customers require DPA and EU-hosted storage.
7. **Disaster recovery** — local JSON has no backup; Sheets has no versioning by default.

---

## Prioritized Remediation Checklist

### Phase 2 — Immediate (before any external demo with live credentials)
- [ ] **B2** — Remove JWT secret fallback from `src/lib/token.js:5`; add startup guard (throw if TOKEN_SECRET < 32 chars)
- [ ] **B3** — Audit git history for the GCP key file; if tracked, run `git filter-repo` and rotate the key
- [ ] **B1-partial** — Remove `SANDBOX_PARTNER_SECRET` constant from `src/server.js:41`; read from env only; fail hard if unset in non-demo mode

### Phase 2 — Transport hardening
- [ ] **H3** — Add per-IP rate limiting on `/app/login`, `/app/register`, `/v1/auth/accesstokenrequest`
- [ ] **H4/L2** — Cap body at 64 KB; send `fail(res, 413)` before `req.destroy()`
- [ ] **H5** — Return 400 on invalid JSON instead of `resolve({})`
- [ ] **H2** — Replace CORS `*` with explicit origin allowlist on `/app/*` routes
- [ ] **M2** — Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP on HTML responses

### Phase 2 — Coverage
- [ ] **H9** — Add `password.js` unit tests for malformed-stored-hash and catch paths (bring branch > 80%)
- [ ] **H1** — Add sheetsStore tests (mock `fetch`); target >80% branch coverage
- [ ] **L1** — Add expired-token test to `token.js`
- [ ] **L6** — Add startup test for `start(0)`

### Phase 3 — Architecture
- [ ] **H6** — Strip `platformPassword` from `/v1/account/list` and all item responses
- [ ] **H8** — Add TTL to Sheets `_headers` cache
- [ ] **M3** — Serialize `nextAccountId()` inside `insert()` with a lock
- [ ] **M5** — Replace `fs.unlinkSync` in `localStore.reset()` with overwrite
- [ ] **M6** — Replace in-place balance mutation with append-only transaction log
- [ ] **M7** — Add zero-floor to simulate balance (`cash = Math.max(0, cash)`) and handle margin-call state
- [ ] **M8** — Add startup health-check for Sheets backend; fail fast on misconfiguration
- [ ] **M1** — Test `store.js` Sheets-fallback branch; consider hard-crash on misconfiguration

### Phase 4 — UI wiring
- [ ] **L5** — Wire `td-funding.jsx submit()` to `POST /app/account/deposit`
- [ ] **L4** — Wire `td-market.jsx` to `/v1/quotes` instead of returning mock data
- [ ] **L3** — Remove dead `fakeReq` variable in createbulk handler (`src/server.js:328`)
