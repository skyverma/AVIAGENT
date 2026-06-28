import { Preferences } from '@capacitor/preferences'
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from './llmDefaults'
import type { AppSettings, ChatSession, LlmProvider, StoredFile } from './types'

const KEYS = {
  settings: 'avia_settings',
  chats: 'avia_chats',
  files: 'avia_files_meta',
} as const

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key })
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

async function writeJson(key: string, value: unknown) {
  await Preferences.set({ key, value: JSON.stringify(value) })
}

function migrateSettings(raw: Record<string, unknown>): AppSettings {
  const provider = (raw.llmProvider as LlmProvider) || DEFAULT_PROVIDER
  return {
    username: String(raw.username || ''),
    llmProvider: provider,
    llmModel: String(raw.llmModel || DEFAULT_MODEL),
    customApiKey: String(raw.customApiKey || raw.geminiApiKey || ''),
    onboarded: Boolean(raw.onboarded),
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const { value } = await Preferences.get({ key: KEYS.settings })
  if (!value) {
    return {
      username: '',
      llmProvider: DEFAULT_PROVIDER,
      llmModel: DEFAULT_MODEL,
      customApiKey: '',
      onboarded: false,
    }
  }
  try {
    return migrateSettings(JSON.parse(value) as Record<string, unknown>)
  } catch {
    return {
      username: '',
      llmProvider: DEFAULT_PROVIDER,
      llmModel: DEFAULT_MODEL,
      customApiKey: '',
      onboarded: false,
    }
  }
}

export async function saveSettings(settings: AppSettings) {
  await writeJson(KEYS.settings, settings)
}

export async function loadChats(): Promise<ChatSession[]> {
  return readJson<ChatSession[]>(KEYS.chats, [])
}

export async function saveChats(chats: ChatSession[]) {
  await writeJson(KEYS.chats, chats)
}

export async function loadFilesMeta(): Promise<StoredFile[]> {
  return readJson<StoredFile[]>(KEYS.files, [])
}

export async function saveFilesMeta(files: StoredFile[]) {
  await writeJson(KEYS.files, files)
}

export async function clearAllData() {
  await Preferences.clear()
}
