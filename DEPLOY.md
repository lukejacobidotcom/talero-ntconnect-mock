# Deploy Talero to Render

Two unavoidable logins are yours (I can't sign into them): **GitHub** (holds the code) and
**Render** (runs it). Everything else is automated.

## A. Push the code to GitHub
1. Go to https://github.com/new → create an **empty** repo named `talero-ntconnect-mock`
   (no README, no .gitignore, no license).
2. Open `deploy.bat` in this folder, replace `CHANGE_ME` in the `REPO_URL` line with your
   GitHub username, save.
3. Double-click `deploy.bat`. If a GitHub sign-in window appears, approve it.
   (Needs Git installed: https://git-scm.com)

> No Git? Alternative: on the new repo page click **uploading an existing file** and drag in
> everything **except** the `data/db.json`, `.env`, and `*.json` key file.

## B. Create the Render service
1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Connect GitHub if asked, pick `talero-ntconnect-mock`, click **Apply**.
3. Render reads `render.yaml` and deploys a Node web service on the free plan.
   `TOKEN_SECRET` is auto-generated. First deploy uses the **local seeded backend** — no
   secrets needed — so the site works immediately.
4. When the build finishes you get a URL like `https://talero-ntconnect-mock.onrender.com`.
   Open it: homepage → Open account → dashboard → Deposit / Simulate.

> Free web services sleep when idle; the first hit after a nap takes ~30s to wake.

## C. (Optional) Point the LIVE site at your Google Sheet
In the Render service → **Environment** → add:
- `DATA_BACKEND` = `sheets`
- `SHEET_ID` = `1xcWbCkuRv1pka2aDS-OWOrnxCPnCFi5fqi7nbYbXpXY`
- `GOOGLE_SERVICE_ACCOUNT_JSON` = base64 of your `talero-ninja-api-*.json`
  (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("talero-ninja-api-77e163ccb986.json"))`)

Save → it redeploys. Now the live site reads/writes your Sheet.
Keep the sheet shared (Editor) with `talero-ninja@talero-ninja-api.iam.gserviceaccount.com`.
