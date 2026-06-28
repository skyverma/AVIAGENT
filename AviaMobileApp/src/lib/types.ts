export type LlmProvider = 'huggingface' | 'deepseek' | 'gemini'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export type ChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
  fileId?: string
}

export type StoredFile = {
  id: string
  name: string
  rows: number
  columns: number
  columnNames: string[]
  sampleRows: Record<string, unknown>[]
  createdAt: number
}

export type AppSettings = {
  username: string
  llmProvider: LlmProvider
  llmModel: string
  /** User override; empty = use built-in free key from APK build */
  customApiKey: string
  onboarded: boolean
}
