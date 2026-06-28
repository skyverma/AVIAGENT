import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { hasBuiltinKey } from '@/lib/llmDefaults'

export function OnboardingPage() {
  const { settings, setSettings } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState(settings.username || '')
  const [apiKey, setApiKey] = useState(settings.customApiKey || '')
  const [error, setError] = useState('')

  const freeIncluded = hasBuiltinKey('huggingface') || hasBuiltinKey('deepseek')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('Enter your name')
      return
    }
    await setSettings({
      ...settings,
      username: username.trim(),
      customApiKey: apiKey.trim(),
      onboarded: true,
    })
    navigate('/chat', { replace: true })
  }

  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col justify-center px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-qm-blue to-violet-500 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-qm-navy">AviaAgent</h1>
          <p className="mt-2 text-sm text-slate-500">
            Standalone mobile analyst. Data stays on your phone.
          </p>
          {freeIncluded && (
            <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
              Free DeepSeek AI is included — no API key needed to start.
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Your name</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-qm-blue focus:ring-2 focus:ring-qm-blue/20"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              API key <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-qm-blue focus:ring-2 focus:ring-qm-blue/20"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave empty to use free DeepSeek"
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Optional override. Change provider & model in Settings. Internet required for AI.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-qm-blue py-3.5 text-base font-semibold text-white active:scale-[0.98]"
          >
            Get started
          </button>
        </form>
      </div>
    </div>
  )
}
