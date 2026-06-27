# AviaAgent Mobile (Capacitor / Android)

Thin native shell (WebView) that loads the AVIAGENT web UI from your running server. Docker and backend services are unchanged.

## Prerequisites

- Node.js 18+
- Android Studio + JDK 17 + one Android emulator (AVD)
- AVIAGENT stack running on your PC: `docker compose up -d`
- UI available at **http://localhost:8091** on the host

## Target URL

Edit `capacitor.config.ts` or set `TARGET_URL` before sync/run:

| Environment | URL |
|-------------|-----|
| Android emulator (default) | `http://10.0.2.2:8091` |
| Real phone (same Wi-Fi) | `http://<PC_LAN_IP>:8091` |
| AWS / production | `https://your-aws-domain.com` |

`10.0.2.2` is the emulator’s alias for the host machine’s `localhost`.

### Change URL for a session

```powershell
cd AVIAGENT\AviaMobile
$env:TARGET_URL="http://192.168.1.5:8091"
npx cap sync android
npx cap run android
```

## Dev test (live reload, no APK rebuild per UI change)

1. Start Docker: `docker compose up -d` (repo root)
2. Run on emulator:

```powershell
cd AVIAGENT\AviaMobile
npm install
npx cap sync android
npm run run:android
```

The app loads the remote URL from `capacitor.config.ts`. Refresh the WebView to see server-side UI updates. Rebuild/sync only when you change native config or Capacitor plugins.

## Open in Android Studio

```powershell
npm run open:android
```

Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

APK output: `android/app/build/outputs/apk/`

## Release APK (AWS backend)

1. Set production URL in `capacitor.config.ts` (or `TARGET_URL` + `npx cap sync`)
2. For HTTPS, set `cleartext: false` and `androidScheme: 'https'`
3. Build release APK in Android Studio

## Architecture

```
Capacitor WebView → server.url → Docker frontend :8091 → api / auth / ai
```

Same-origin session cookies and relative API paths work without backend changes.

## Troubleshooting

- **Blank / loading screen**: Confirm Docker is up and `curl http://localhost:8091` works on the PC
- **Emulator can’t connect**: Use `10.0.2.2`, not `localhost`
- **Phone can’t connect**: Use PC LAN IP; allow port 8091 in Windows Firewall
- **HTTP blocked**: `android:usesCleartextTraffic="true"` is set in `AndroidManifest.xml` for dev
