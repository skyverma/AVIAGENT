# AviaAgent Mobile App (Standalone APK)

**Fully bundled mobile app** — no Cloudflare, no Docker, no PC server.

## What it does

- UI runs **inside the APK** (not a remote website)
- Chats & file metadata stored **on the phone** (Capacitor Preferences)
- Upload CSV/Excel → parsed on device
- AI answers via **direct Gemini API** (internet required; API key in Settings)
- Mobile layout: bottom tabs (Chat / Files / Settings), slide-out history, touch-friendly

## What it does NOT include (vs full AVIAGENT web)

- No Python/pandas code execution pipeline
- No notebook mode
- No shared cloud database — each install is independent

## Build APK

Prerequisites: JDK 21 + Android SDK (already at `C:\Android\` if you built before)

```powershell
cd AVIAGENT\AviaMobileApp
npm install
npm run build
npx cap add android   # first time only
npx cap sync android
cd android
$env:JAVA_HOME="C:\Android\jdk21\jdk-21.0.11+10"
$env:ANDROID_HOME="C:\Android\sdk"
.\gradlew.bat assembleDebug
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`

## AI providers

- **Default (free):** DeepSeek V3 via Hugging Face — same as AVIAGENT web (`deepseek-ai/DeepSeek-V3-0324`)
- **Optional:** Direct DeepSeek API, or Gemini with your own key
- Users can skip API key on onboarding if you bake a free key into the APK (see below)

### Bake free DeepSeek key into APK (for clients)

Before building, copy `AviaMobileApp/.env.example` → `.env` and set:

```env
VITE_DEFAULT_HF_API_KEY=hf_your_token_from_huggingface
VITE_DEFAULT_LLM_PROVIDER=huggingface
VITE_DEFAULT_LLM_MODEL=deepseek-ai/DeepSeek-V3-0324
```

Get a free HF token: https://huggingface.co/settings/tokens (enable Inference Providers)

Clients can leave API key empty and use the built-in free DeepSeek. Power users can add their own key in Settings.

## Dev in browser (no APK)

```powershell
npm run dev
```

Open http://localhost:5175 — test mobile UI in Chrome DevTools device mode.
