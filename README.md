# ASTRA · Guild Manager

A real-time guild management app backed entirely by a **Google Sheet**.

- **Sheet → page:** the backend re-reads the spreadsheet every few seconds; every open browser refreshes automatically.
- **Page → sheet:** every edit, add, and delete is written straight back to the spreadsheet.
- **Admin** (`admin` / `astra1221` by default): every tab becomes a panel with search, column filters, inline editing, row add/delete.
- **Members:** sign in with **IGN / IGN**, see only their own profile (styled as a real account page, not a table), and edit their own rows. Passwords can be changed in settings.
- Login credentials live in a **hidden `credentials` tab** created automatically in the spreadsheet — never exposed through the API.

## Architecture

```
Browser (GitHub Pages)  ──poll 4s──▶  API (Railway)  ──Sheets API──▶  Google Sheet
        ▲                                  │
        └──────── writes (JWT auth) ───────┘
```

| Piece | Where | Notes |
| --- | --- | --- |
| `client/` | GitHub Pages | Vite + React SPA, built by `.github/workflows/pages.yml` |
| `server/` | Railway | Express + Google Sheets API, polls the sheet every 5s |
| Google Sheet | — | The database. Tabs are discovered dynamically, so adding a tab adds a panel. |

## Local development

```bash
# 1. API  (needs server/.env — see below)
cd server && npm install && npm run dev        # http://localhost:3001

# 2. UI   (proxies /api to :3001 automatically)
cd client && npm install && npm run dev        # http://localhost:5173
```

Copy `server/.env.example` → `server/.env` and fill it in.

## Deploying

### 1. Railway (API)

1. Create a new Railway service from this repository (default settings — **no Root Directory needed**).
2. Railway's builder reads the root `package.json`: it runs `npm ci --prefix server && npm run build --prefix server`, then `npm start` (which runs the API from `server/`).
   - Fallback: if the build ever fails to detect the app, set **Root Directory** to `server` instead — `server/railway.json` then handles the build with Nixpacks.
3. Add these environment variables (Railway → Variables):

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_SHEETS_ID` | `1-HG1_avrgEG6jpdFYwmQq6EDuBBQXKub9bo7IUxueCw` |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | your service account |
   | `GOOGLE_PRIVATE_KEY` | full PEM key with `\n` escapes, quoted |
   | `JWT_SECRET` | long random string (≥ 24 chars) |
   | `CORS_ORIGINS` | `https://momowzen.github.io` |
   | `NODE_ENV` | `production` |

4. Share the spreadsheet with the service account email as **Editor** (already done for the current service account).

### 2. GitHub Pages (UI)

1. Repo → **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` — `.github/workflows/pages.yml` builds `client/` and deploys it.
3. Once you know your Railway URL, edit **`client/public/config.js`**:

   ```js
   window.ASTRA_CONFIG = {
     apiBase: "https://your-service.up.railway.app/api",
   };
   ```

   and push again. Until this is set the page shows a clear "API not configured" message.
   (For quick tests you can also append `?https://your-url/api` — no rebuild needed.)

## Google Sheet conventions

- **Column A must be `IGN`** on every tab — members are matched by their exact IGN.
- Tabs with **two header rows** (group row + sub-header row) render as grouped headers with per-column toggles.
- Tabs with **one header row** render as editable forms/tables.
- New tabs appear as new panels automatically; hidden tabs are ignored.

## Security notes

- Passwords are stored as **scrypt hashes + salts** in the hidden `credentials` tab — never in plaintext, never returned by the API.
- JWTs expire after 7 days; login attempts are rate-limited.
- Members can only read/write rows whose column A matches their own IGN (verified live against the sheet before every write), and cannot change their IGN or inject formulas.
- `credentials` tab is excluded from every data response, for admins included.

## Scripts

```bash
cd server && npm run typecheck   # tsc --noEmit
cd client && npm run build       # typecheck + production build
```
