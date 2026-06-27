export type GeminiModelOption = { id: string; label: string; api_model: string }

export const GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', api_model: 'gemini-2.5-flash' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', api_model: 'gemini-3-flash-preview' },
  { id: 'gemini-3.1-flash-preview', label: 'Gemini 3.1 Flash Preview', api_model: 'gemini-3.1-flash-lite' },
]

const STORAGE_KEY = 'avia-gemini-model'

export function readGeminiModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'gemini-3-flash'
  } catch {
    return 'gemini-3-flash'
  }
}

export function writeGeminiModel(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
