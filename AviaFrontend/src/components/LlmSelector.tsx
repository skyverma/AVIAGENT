import { useEffect, useState } from 'react'
import { KeyRound, Sparkles } from 'lucide-react'
import {
  FALLBACK_CATALOG,
  fetchLlmCatalog,
  readLlmSelection,
  writeLlmSelection,
  type LlmCatalog,
  type LlmSelection,
} from '@/lib/llmConfig'
import { cn } from '@/lib/utils'

type Props = {
  value: LlmSelection
  onChange: (selection: LlmSelection) => void
  compact?: boolean
  className?: string
}

export function LlmSelector({ value, onChange, compact = false, className }: Props) {
  const [catalog, setCatalog] = useState<LlmCatalog>(FALLBACK_CATALOG)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    fetchLlmCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(FALLBACK_CATALOG))
  }, [])

  const provider = catalog.providers.find((p) => p.id === value.provider) ?? catalog.providers[0]
  const models = provider?.models ?? []
  const needsKey = provider?.requires_api_key && !provider.available

  const update = (patch: Partial<LlmSelection>) => {
    const next = { ...value, ...patch }
    if (patch.provider && patch.provider !== value.provider) {
      const nextProv = catalog.providers.find((p) => p.id === patch.provider)
      next.model = nextProv?.models[0]?.id ?? ''
      try {
        next.apiKey = localStorage.getItem(`avia-llm-api-key-${patch.provider}`) || ''
      } catch {
        next.apiKey = ''
      }
    }
    writeLlmSelection(next)
    onChange(next)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className={cn('flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1', compact && 'text-[11px]')}>
        <Sparkles className={cn('text-violet-500', compact ? 'ml-1 h-3 w-3' : 'ml-1.5 h-3.5 w-3.5')} />
        <select
          value={value.provider}
          onChange={(e) => update({ provider: e.target.value })}
          className="cursor-pointer bg-transparent pr-1 font-medium text-qm-navy focus:outline-none"
          title="LLM Provider"
        >
          {catalog.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}{p.is_free ? ' · free' : ''}
            </option>
          ))}
        </select>
        <span className="text-slate-300">|</span>
        <select
          value={value.model}
          onChange={(e) => update({ model: e.target.value })}
          className="cursor-pointer bg-transparent pr-1 font-medium text-qm-navy focus:outline-none"
          title="Model"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        {needsKey && (
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="mr-1 rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-qm-navy"
            title="Add API key"
          >
            <KeyRound className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          </button>
        )}
      </div>
      {showKey && needsKey && (
        <input
          type="password"
          placeholder={`${provider?.label} API key`}
          value={value.apiKey}
          onChange={(e) => update({ apiKey: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-qm-blue focus:outline-none"
        />
      )}
      {provider?.id === 'ollama' && !provider.available && (
        <p className="text-[10px] text-amber-600">Install Ollama locally and run: ollama pull qwen2.5-coder:7b</p>
      )}
    </div>
  )
}

export function useLlmSelection(): [LlmSelection, (s: LlmSelection) => void] {
  const [selection, setSelection] = useState<LlmSelection>(readLlmSelection)
  const update = (s: LlmSelection) => {
    writeLlmSelection(s)
    setSelection(s)
  }
  return [selection, update]
}
