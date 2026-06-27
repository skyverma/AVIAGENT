# AviaAgent Desktop (Electron)

Thin native shell that loads the AVIAGENT web UI from your running server. Docker and backend services are unchanged.

## Prerequisites

- Node.js 18+
- AVIAGENT stack running: `docker compose up -d` from the repo root
- UI available at **http://localhost:8091**

## Target URL

Set `TARGET_URL` to point at your AVIAGENT origin (nginx frontend):

| Environment | `TARGET_URL` |
|-------------|--------------|
| Local Docker (default) | `http://localhost:8091` |
| AWS / production | `https://your-aws-domain.com` |

## Dev test (no installer)

```powershell
cd AVIAGENT\AviaDesktop
npm install
npm run dev
```

Opens a desktop window loading the server. Restart to pick up URL changes.

Optional: open DevTools with `ELECTRON_DEVTOOLS=1`:

```powershell
$env:ELECTRON_DEVTOOLS="1"; npm run dev
```

## Build Windows installer

```powershell
cd AVIAGENT\AviaDesktop
npm run build:win
```

Output: `dist/AviaAgent Setup.exe`

For a production build pointing at AWS:

```powershell
$env:TARGET_URL="https://your-aws-domain.com"; npm run build:win
```

Note: `TARGET_URL` is read at **runtime** when the app starts (`main.js`). The built EXE uses the default `http://localhost:8091` unless you set the env var before launch, or change the default in `main.js` before building.

## Architecture

```
Electron window → loadURL(TARGET_URL) → Docker frontend :8091 → api / auth / ai
```

Same-origin cookies and relative API paths (`/api`, `/auth/api`, `/ai/api`) work without CORS changes.
