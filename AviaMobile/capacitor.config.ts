import type { CapacitorConfig } from '@capacitor/cli'

// Public Cloudflare Tunnel URL (shareable APK for client/friends).
// NOTE: quick-tunnel URLs change on each `cloudflared` restart. If the tunnel
// restarts, update this URL (and .env CORS/hosts) and rebuild the APK.
// Override per session with TARGET_URL env var if needed.
const targetUrl =
  process.env.TARGET_URL || 'https://soap-ceremony-studies-generic.trycloudflare.com'

const config: CapacitorConfig = {
  appId: 'com.aviagent.mobile',
  appName: 'AviaAgent',
  webDir: 'www',
  server: {
    url: targetUrl,
    cleartext: targetUrl.startsWith('http://'),
    androidScheme: targetUrl.startsWith('https://') ? 'https' : 'http',
  },
}

export default config
