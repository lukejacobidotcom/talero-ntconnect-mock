#!/usr/bin/env bash
# End-to-end smoke test for the Talero NT Connect mock.
# Proves: timestamp -> token (via issued API key) -> create account -> pull it down -> cash balance.
set -euo pipefail
BASE="${BASE:-http://localhost:8787}"
CID="${CID:-80432}"
SEC="${SEC:-ntc_demo_sk_9c1f4b7e2a6d05e3b8c4f17a0d29e6b5}"
NAME="${NAME:-talero.partner.admin}"

j() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }

echo "== 1. GET /v1/timestamp =="
curl -s "$BASE/v1/timestamp"; echo

echo "== 2. POST /v1/auth/accesstokenrequest (issued API key) =="
TOK=$(curl -s -X POST "$BASE/v1/auth/accesstokenrequest" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$NAME\",\"password\":\"x\",\"appId\":\"Talero.NTConnect.Partner\",\"appVersion\":\"1.0\",\"cid\":$CID,\"sec\":\"$SEC\"}" \
  | j "['accessToken']")
echo "accessToken acquired: ${TOK:0:24}..."

AUTH=(-H "Authorization: Bearer $TOK")

echo "== 3. GET /v1/account/list (seeded) =="
curl -s "${AUTH[@]}" "$BASE/v1/account/list" | python3 -c "import sys,json;[print(' ',a['id'],a['nickname'],'-',a['state']) for a in json.load(sys.stdin)]"

echo "== 4. POST /v1/account/create (a 'future' account) =="
NEWID=$(curl -s -X POST "${AUTH[@]}" "$BASE/v1/account/create" \
  -H 'Content-Type: application/json' \
  -d '{"ownerEmail":"newtrader@example.com","firstName":"New","lastName":"Trader","legalStatus":"Individual","nickname":"Sandbox test account"}' \
  | j "['id']")
echo "created account id: $NEWID"

echo "== 5. GET /v1/account/item?id=$NEWID (pull it back down) =="
curl -s "${AUTH[@]}" "$BASE/v1/account/item?id=$NEWID" | python3 -m json.tool

echo "== 6. GET /v1/cashBalance/getcashbalancesnapshot?accountId=$NEWID =="
curl -s "${AUTH[@]}" "$BASE/v1/cashBalance/getcashbalancesnapshot?accountId=$NEWID" | python3 -m json.tool

echo "== 7. Auth gate check: no token should 401 =="
curl -s -o /dev/null -w "  /v1/account/list without token -> HTTP %{http_code}\n" "$BASE/v1/account/list"

echo "== SMOKE TEST PASSED =="
