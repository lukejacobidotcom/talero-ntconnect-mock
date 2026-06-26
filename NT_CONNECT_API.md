# NT Connect Partner API — Reference (Talero sandbox clone)

> **Platform.** NT Connect is the **Tradovate-based** partner API. Bearer-token auth,
> relaxed REST (`/v1/`), JSON. Bases: `live.tradovateapi.com` (live),
> `demo.tradovateapi.com` (sim), `md.tradovateapi.com` (market data); staging on
> `*.staging.ninjatrader.dev`. Access requires **Org Admin creds + API Key + CID**.
>
> **This document describes the Talero sandbox** that clones that contract for development
> before live partner credentials are issued. Base URL in the sandbox is your Render URL
> (or `http://localhost:8787`). It is **not** affiliated with NinjaTrader and must not be
> presented as a production brokerage backend.

Resource groups served: Get Timestamp · OIDC User Info · Users · Authentication ·
Accounting · Risks · Funds · Alerts · Customer Applications · Orders · Contract Library ·
Fees · Positions. (Configuration / Personal Info exist in the real API; not needed for the
current frontend and omitted from the sandbox.)

---

## Authentication

All `/v1/*` calls except `GET /v1/timestamp` require:

```
Authorization: Bearer <accessToken>
```

### `POST /v1/auth/accesstokenrequest`
Exchange your issued **CID + API key (`sec`)** for an access token.

Request:
```json
{
  "name": "talero.partner.admin",
  "password": "<org admin password>",
  "appId": "Talero.NTConnect.Partner",
  "appVersion": "1.0",
  "cid": 80432,
  "sec": "ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5"
}
```
Response:
```json
{
  "accessToken": "eyJhbGciOi...",
  "mdAccessToken": "eyJhbGciOi...",
  "expirationTime": "2026-06-25T17:45:00.000Z",
  "userId": 700001,
  "name": "talero.partner.admin",
  "userStatus": "Active",
  "hasLive": false
}
```
Bad credentials return `200` with `{ "errorText": "..." }` (Tradovate convention).

---

## Accounting — accounts

### `GET /v1/account/list`
Returns every account. Example element:
```json
{
  "id": 1912208, "name": "TAL-1912208", "userId": 700102,
  "accountType": "Customer", "active": true,
  "clearingHouse": "NinjaTrader Clearing, LLC",
  "legalStatus": "Individual", "marginAccountType": "Speculator",
  "riskCategoryId": 1, "autoLiqProfileId": 2,
  "nickname": "Jordan — Individual", "ownerEmail": "jordan.castillo@example.com",
  "state": "active", "provisioning": "provisioned", "openedDate": "2026-05-12"
}
```

### `GET /v1/account/item?id=1912208`
Single account by id.

### `POST /v1/account/create`  — *create an account in the sandbox*
Persists a new account (and an owner user + a zero cash-balance snapshot) and returns it.
```json
{ "ownerEmail": "newtrader@example.com", "firstName": "New", "lastName": "Trader",
  "legalStatus": "Individual", "nickname": "Sandbox test account" }
```
Returns the created account with a generated `id`, `platformPassword`, and
`state: "pending_funding"`. Immediately retrievable via `GET /v1/account/item?id=<id>`.

### `POST /v1/account/createbulk`
`{ "items": [ {…}, {…} ] }` → bulk create.

---

## Accounting — cash balance

### `GET /v1/cashBalance/getcashbalancesnapshot?accountId=1912208`
```json
{
  "accountId": 1912208, "currencyId": 1,
  "cashBalance": 12640.55, "netLiq": 13180.20, "openPnL": 539.65,
  "realizedPnL": 312.40, "initialMargin": 1320.00, "maintenanceMargin": 1200.00,
  "availableForTrading": 11320.55, "tradeDate": {"year":2026,"month":6,"day":24}
}
```
`GET /v1/cashBalance/list` returns all snapshots.

---

## Users
- `GET /v1/user/list` · `GET /v1/user/item?id=`
- `POST /v1/user/create` `{ "email": "...", "firstName": "...", "lastName": "..." }`
- `POST /v1/user/createbulk` `{ "items": [...] }`

## Positions / Orders
- `GET /v1/position/list?accountId=` — `{ symbol, netPos, netPrice, openPnL, ... }`
- `GET /v1/order/list?accountId=` — `{ symbol, action, orderType, orderQty, ordStatus, avgFillPrice, ... }`

## Funds
- `GET /v1/funds/list?accountId=`
- `POST /v1/funds/deposit` `{ "accountId": 1912208, "amount": 5000, "method": "ACH (Plaid)" }`
- `POST /v1/funds/withdraw` `{ "accountId": 1912208, "amount": 1000 }` → `pending_review`
  (return-to-originator; destination of record = NinjaTrader Clearing, LLC).

## Risks
- `GET /v1/risk/list?accountId=`
- `POST /v1/risk/apply` `{ "accountId": 1912208, "dailyLossLimit": 1500, "maxPosition": 10 }`
- `POST /v1/risk/halt` `{ "accountId": 1912208, "halted": true }` or `{ "scope": "org", "halted": true }` (kill switch).

## Customer Applications (AOP)
- `GET /v1/customerApplication/list` · `GET /v1/customerApplication/item?id=`
- `POST /v1/customerApplication/create` `{ "applicantEmail": "...", "legalStatus": "Individual" }`
- `POST /v1/customerApplication/approve` `{ "id": 90003 }` → approves + issues an account.

## Contract Library / Fees / Alerts / Timestamp
- `GET /v1/contract/list` · `GET /v1/product/list`
- `GET /v1/fee/list?accountId=` · `GET /v1/alert/list?accountId=`
- `GET /v1/timestamp` (no token).

---

## Talero app layer (NOT NT Connect)
The customer-facing app's own auth, so the frontend login/registration screens work.
- `POST /app/register` `{ "email": "...", "password": "..." }` → `{ sessionToken, user }`
- `POST /app/login` `{ "email": "..." }` → `{ sessionToken, user, accounts }`
- `GET /app/me` (Bearer session) → `{ user, accounts }`
