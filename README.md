# Talero — NT Connect mock API + Google Sheets datastore

A working sandbox that **clones the NT Connect (Tradovate-based) `/v1` partner API** so the
Talero marketing site, login/registration, dashboard, and back-office can be built and
demoed **before live NinjaTrader partner credentials are issued**. Data lives in **Google
Sheets** (or a local JSON file). Self-issued API keys stand in for Ninja's until the real
ones arrive.

> **Why a clone, not the real thing?** `connect.ninjatrader.com` is a partner-gated
> marketing page — there is no public NT Connect API doc or public sandbox key; access is
> behind a partner agreement. Per Talero's own `docs/backoffice-ntconnect-reconciliation.md`,
> NT Connect runs on the **Tradovate** engine (`*.tradovateapi.com`, `/v1`, Bearer auth),
> whose surface *is* documented — so this mock clones that contract. When real credentials
> arrive, point the frontend at the live base URL; the request/response shapes already match.
>
> **Sandbox notice.** Not affiliated with NinjaTrader. Dummy data only. Do not present as a
> production brokerage backend or to customers/regulators.

---

## 1. Run it locally (zero setup, zero dependencies)

```bash
cd talero-ntconnect-mock
npm start              # -> http://localhost:8787  (backend = local JSON)
npm run smoke          # end-to-end test: token -> create account -> pull it back
```
`npm run reset` restores the seeded data.

## 2. Issued API keys (your stand-in "Ninja" keys)

On the **ApiKeys** tab of the workbook / in `data/seed.json`:

| Field | DEMO / sandbox (active) |
|---|---|
| `cid` | `80432` |
| `appId` | `Talero.NTConnect.Partner` |
| `sec` (API key) | `ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5` |
| Org admin user | `talero.partner.admin` |

A `live` key (`cid 80433`, `ntc_live_sk_...`) is seeded but **disabled** until you flip it.

Get a token:
```bash
curl -s -X POST http://localhost:8787/v1/auth/accesstokenrequest \
  -H 'Content-Type: application/json' \
  -d '{"name":"talero.partner.admin","appId":"Talero.NTConnect.Partner","appVersion":"1.0","cid":80432,"sec":"ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5"}'
```

## 3. Make Google Sheets the datastore

1. Import `Talero_NTConnect_Sheets_DB.xlsx` into Google Sheets
   (Drive → New → File upload → Open → File → *Save as Google Sheets*).
2. Google Cloud Console → create a **service account** → create a **JSON key**.
   Enable the **Google Sheets API** for the project.
3. **Share the sheet** (Editor) with the service account's `client_email`.
4. Set env and run:
   ```bash
   export DATA_BACKEND=sheets
   export SHEET_ID=<id from the sheet URL>
   export GOOGLE_SERVICE_ACCOUNT_JSON="$(base64 -w0 service-account.json)"
   npm start
   ```
   The server now reads/writes the live Sheet. Tab names + row-1 headers already match the
   field names the API uses, so behaviour is identical to local mode — accounts you create
   via the API land as new rows you can watch appear in the Sheet.

## 4. Deploy to Render

1. Push this folder to a GitHub repo.
2. Render → **New + → Blueprint** → pick the repo (it reads `render.yaml`).
3. It deploys as a Node web service. `TOKEN_SECRET` is auto-generated.
4. To go Sheets-backed in prod: set `DATA_BACKEND=sheets`, `SHEET_ID`, and
   `GOOGLE_SERVICE_ACCOUNT_JSON` (base64) in the service's Environment tab, then redeploy.

> Free Render web services sleep when idle and cold-start on the next request — fine for a
> sandbox/demo.

## 5. Wire the frontend

The Talero frontend calls an `API_BASE`. Point it at this service:
- local: `http://localhost:8787`
- Render: `https://talero-ntconnect-mock.onrender.com`

Marketing site = static (host the landing HTML anywhere / as its own Render static site).
Login/registration → `POST /app/register`, `POST /app/login`. Dashboard → `/v1/account/list`,
`/v1/cashBalance/getcashbalancesnapshot`, `/v1/position/list`, etc. CORS is open on the mock.

## 6. What's in the box

```
src/server.js            zero-dep HTTP server (the API)
src/lib/localStore.js    local JSON datastore (default)
src/lib/sheetsStore.js   Google Sheets datastore (RS256 service-account auth)
src/lib/store.js         backend selector (+ auto-fallback to local)
src/lib/token.js         HS256 access tokens
data/seed.json           single source of truth for dummy data + issued keys
scripts/build_workbook.py  regenerates the .xlsx from seed.json
scripts/smoke_test.sh    end-to-end test
NT_CONNECT_API.md        API reference (the cloned docs)
Talero_NTConnect_Sheets_DB.xlsx   the Google-Sheets datastore (import this)
render.yaml / .env.example        deploy + config
```
