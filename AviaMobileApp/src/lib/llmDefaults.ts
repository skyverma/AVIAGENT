import type { LlmProvider } from './types'

/** Baked in at APK build time from AviaMobileApp/.env (see .env.example). */
export const BUILTIN_KEYS: Record<LlmProvider, string> = {
  huggingface: import.meta.env.VITE_DEFAULT_HF_API_KEY || '',
  deepseek: import.meta.env.VITE_DEFAULT_DEEPSEEK_API_KEY || '',
  gemini: import.meta.env.VITE_DEFAULT_GEMINI_API_KEY || '',
}

export const DEFAULT_PROVIDER: LlmProvider =
  (import.meta.env.VITE_DEFAULT_LLM_PROVIDER as LlmProvider) || 'huggingface'

export const DEFAULT_MODEL =
  import.meta.env.VITE_DEFAULT_LLM_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  huggingface: 'DeepSeek V3 via Hugging Face (free)',
  deepseek: 'DeepSeek API (free tier)',
  gemini: 'Google Gemini',
}

export const PROVIDER_MODELS: Record<LlmProvider, { id: string; label: string }[]> = {
  huggingface: [
    { id: 'deepseek-ai/DeepSeek-V3-0324', label: 'DeepSeek V3 (best reasoning)' },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B' },
    { id: 'Qwen/Qwen2.5-Coder-7B-Instruct', label: 'Qwen 2.5 Coder 7B (fast)' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
}

export function resolveApiKey(provider: LlmProvider, customKey: string): string {
  return customKey.trim() || BUILTIN_KEYS[provider].trim()
}

export function hasBuiltinKey(provider: LlmProvider): boolean {
  return Boolean(BUILTIN_KEYS[provider].trim())
}
