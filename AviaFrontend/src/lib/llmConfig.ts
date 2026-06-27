import { AI_API } from '@/lib/api'

export type LlmModelOption = { id: string; label: string }

export type LlmProviderOption = {
  id: string
  label: string
  requires_api_key: boolean
  is_free: boolean
  available: boolean
  models: LlmModelOption[]
}

export type LlmCatalog = {
  default_provider: string
  default_model: string
  providers: LlmProviderOption[]
}

export type LlmSelection = {
  provider: string
  model: string
  apiKey: string
}

const PROVIDER_KEY = 'avia-llm-provider'
const MODEL_KEY = 'avia-llm-model'
const API_KEY_PREFIX = 'avia-llm-api-key-'

export function readLlmSelection(): LlmSelection {
  try {
    const provider = localStorage.getItem(PROVIDER_KEY) || 'huggingface'
    const model = localStorage.getItem(MODEL_KEY) || 'Qwen/Qwen2.5-Coder-32B-Instruct'
    const apiKey = localStorage.getItem(`${API_KEY_PREFIX}${provider}`) || ''
    return { provider, model, apiKey }
  } catch {
    return { provider: 'huggingface', model: 'Qwen/Qwen2.5-Coder-32B-Instruct', apiKey: '' }
  }
}

export function writeLlmSelection(selection: LlmSelection): void {
  try {
    localStorage.setItem(PROVIDER_KEY, selection.provider)
    localStorage.setItem(MODEL_KEY, selection.model)
    if (selection.apiKey) {
      localStorage.setItem(`${API_KEY_PREFIX}${selection.provider}`, selection.apiKey)
    } else {
      localStorage.removeItem(`${API_KEY_PREFIX}${selection.provider}`)
    }
  } catch {
    /* ignore */
  }
}

export function llmPayload(selection: LlmSelection): { provider: string; model: string; api_key: string } {
  return {
    provider: selection.provider,
    model: selection.model,
    api_key: selection.apiKey,
  }
}

let catalogCache: LlmCatalog | null = null

export async function fetchLlmCatalog(): Promise<LlmCatalog> {
  if (catalogCache) return catalogCache
  const res = await fetch(`${AI_API}/models`)
  if (!res.ok) throw new Error('Failed to load LLM providers')
  catalogCache = await res.json()
  return catalogCache!
}

export function invalidateLlmCatalog(): void {
  catalogCache = null
}

/** Fallback catalog when API is unreachable (e.g. dev without backend). */
export const FALLBACK_CATALOG: LlmCatalog = {
  default_provider: 'huggingface',
  default_model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
  providers: [
    {
      id: 'huggingface',
      label: 'Hugging Face (hosted, free tier)',
      requires_api_key: true,
      is_free: true,
      available: false,
      models: [
        { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B (best for data/code)' },
        { id: 'deepseek-ai/DeepSeek-V3-0324', label: 'DeepSeek V3 (best reasoning)' },
        { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', label: 'Qwen3 235B (largest)' },
        { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B' },
        { id: 'Qwen/Qwen2.5-Coder-7B-Instruct', label: 'Qwen 2.5 Coder 7B (fast)' },
      ],
    },
    {
      id: 'gemini',
      label: 'Google Gemini (paid)',
      requires_api_key: true,
      is_free: false,
      available: false,
      models: [
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      ],
    },
  ],
}
