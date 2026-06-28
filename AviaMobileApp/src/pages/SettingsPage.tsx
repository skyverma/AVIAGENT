import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { hasBuiltinKey, PROVIDER_LABELS, PROVIDER_MODELS } from '@/lib/llmDefaults'
import { clearAllData } from '@/lib/storage'
import type { LlmProvider } from '@/lib/types'

export function SettingsPage() {
  const { settings, setSettings } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState(settings.username)
  const [provider, setProvider] = useState<LlmProvider>(settings.llmProvider)
  const [model, setModel] = useState(settings.llmModel)
  const [apiKey, setApiKey] = useState(settings.customApiKey)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const models = PROVIDER_MODELS[provider]
    if (!models.some((m) => m.id === model)) {
      setModel(models[0]?.id || model)
    }
  }, [provider, model])

  const save = async () => {
    await setSettings({
      ...settings,
      username,
      llmProvider: provider,
      llmModel: model,
      customApiKey: apiKey,
      onboarded: true,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = async () => {
    if (!confirm('Delete all local data and sign out?')) return
    await clearAllData()
    navigate('/', { replace: true })
    window.location.reload()
  }

  const usingBuiltin = !apiKey.trim() && hasBuiltinKey(provider)

  return (
    <div className="app-page">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base font-bold text-qm-navy">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Display name</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="block text-xs font-semibold text-slate-600">AI provider</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
            value={provider}
            onChange={(e) => setProvider(e.target.value as LlmProvider)}
          >
            {(Object.keys(PROVIDER_LABELS) as LlmProvider[]).map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-slate-600">Model</label>
          <select
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {PROVIDER_MODELS[provider].map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-slate-600">
            Your API key <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={usingBuiltin ? 'Using free built-in key' : 'Enter API key'}
          />
          {usingBuiltin && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              Using free built-in {PROVIDER_LABELS[provider]} key from app.
            </p>
          )}

          <button type="button" onClick={() => void save()} className="w-full rounded-xl bg-qm-blue py-3 font-semibold text-white">
            {saved ? 'Saved!' : 'Save settings'}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-qm-navy">
            <Shield className="h-4 w-4" />
            Privacy
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>Default: free DeepSeek via Hugging Face (same as AVIAGENT web).</li>
            <li>Python tab runs pandas on-device (Pyodide).</li>
            <li>Chats and files stay on this phone.</li>
            <li>Internet required for AI replies.</li>
          </ul>
        </section>

        <button
          type="button"
          onClick={() => void reset()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Reset app data
        </button>
      </div>
    </div>
  )
}
