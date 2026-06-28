import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '@/lib/llmDefaults'
import type { AppSettings, ChatSession, StoredFile } from '@/lib/types'
import { loadChats, loadFilesMeta, loadSettings, saveChats, saveFilesMeta, saveSettings } from '@/lib/storage'

type AppState = {
  settings: AppSettings
  setSettings: (s: AppSettings) => Promise<void>
  chats: ChatSession[]
  setChats: (c: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => Promise<void>
  files: StoredFile[]
  setFiles: (f: StoredFile[] | ((prev: StoredFile[]) => StoredFile[])) => Promise<void>
  ready: boolean
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>({
    username: '',
    llmProvider: DEFAULT_PROVIDER,
    llmModel: DEFAULT_MODEL,
    customApiKey: '',
    onboarded: false,
  })
  const [chats, setChatsState] = useState<ChatSession[]>([])
  const [files, setFilesState] = useState<StoredFile[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [s, c, f] = await Promise.all([loadSettings(), loadChats(), loadFilesMeta()])
      setSettingsState(s)
      setChatsState(c)
      setFilesState(f)
      setReady(true)
    })()
  }, [])

  const setSettings = async (s: AppSettings) => {
    setSettingsState(s)
    await saveSettings(s)
  }

  const setChats = async (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setChatsState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      void saveChats(next)
      return next
    })
  }

  const setFiles = async (updater: StoredFile[] | ((prev: StoredFile[]) => StoredFile[])) => {
    setFilesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      void saveFilesMeta(next)
      return next
    })
  }

  return (
    <Ctx.Provider value={{ settings, setSettings, chats, setChats, files, setFiles, ready }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp outside provider')
  return ctx
}
