/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_HF_API_KEY: string
  readonly VITE_DEFAULT_DEEPSEEK_API_KEY: string
  readonly VITE_DEFAULT_GEMINI_API_KEY: string
  readonly VITE_DEFAULT_LLM_PROVIDER: string
  readonly VITE_DEFAULT_LLM_MODEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
