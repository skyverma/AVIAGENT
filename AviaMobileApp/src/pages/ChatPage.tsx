import { useRef, useState } from 'react'
import {
  ArrowUp,
  FileSpreadsheet,
  History,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Sparkles,
  X,
} from 'lucide-react'
import { MarkdownView } from '@/components/MarkdownView'
import { useApp } from '@/context/AppContext'
import { askLlm } from '@/lib/llm'
import type { ChatSession } from '@/lib/types'

const SUGGESTIONS = [
  'Summarize this dataset',
  'Find trends and patterns',
  'List top correlations',
  'Detect outliers',
]

export function ChatPage() {
  const { settings, chats, setChats, files } = useApp()
  const [currentId, setCurrentId] = useState(() => chats[0]?.id || crypto.randomUUID())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const session = chats.find((c) => c.id === currentId)
  const messages = session?.messages ?? []
  const activeFile = files.find((f) => f.id === (activeFileId || session?.fileId)) || null

  const scrollDown = () => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const upsertSession = (updater: (s: ChatSession) => ChatSession) => {
    void setChats((prev) => {
      const exists = prev.some((c) => c.id === currentId)
      const base: ChatSession = exists
        ? prev.find((c) => c.id === currentId)!
        : { id: currentId, title: 'New chat', messages: [], updatedAt: Date.now() }
      const updated = updater(base)
      if (!exists) return [updated, ...prev]
      return prev.map((c) => (c.id === currentId ? updated : c))
    })
  }

  const send = async (text?: string) => {
    const prompt = (text ?? input).trim()
    if (!prompt || loading) return
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user' as const, content: prompt, ts: Date.now() }
    upsertSession((s) => ({
      ...s,
      title: s.title === 'New chat' ? prompt.slice(0, 40) : s.title,
      messages: [...s.messages, userMsg],
      fileId: activeFile?.id || s.fileId,
      updatedAt: Date.now(),
    }))
    scrollDown()

    try {
      const prior = [...messages, userMsg]
      const reply = await askLlm({
        provider: settings.llmProvider,
        model: settings.llmModel,
        customApiKey: settings.customApiKey,
        messages: prior,
        file: activeFile,
        userPrompt: prompt,
      })
      upsertSession((s) => ({
        ...s,
        messages: [...s.messages, { role: 'assistant', content: reply, ts: Date.now() }],
        updatedAt: Date.now(),
      }))
      scrollDown()
    } catch (e) {
      upsertSession((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : e}`, ts: Date.now() },
        ],
        updatedAt: Date.now(),
      }))
    } finally {
      setLoading(false)
    }
  }

  const newChat = () => {
    setCurrentId(crypto.randomUUID())
    setActiveFileId(null)
    setShowHistory(false)
  }

  return (
    <div className="app-page">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-qm-navy">Chat</h1>
          <p className="text-[11px] text-slate-400">Hi, {settings.username || 'there'}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setShowHistory(true)} className="touch-btn rounded-xl p-2.5 active:bg-slate-100" aria-label="History">
            <History className="h-5 w-5 text-slate-600" />
          </button>
          <button type="button" onClick={newChat} className="touch-btn rounded-xl p-2.5 active:bg-slate-100" aria-label="New chat">
            <MessageSquarePlus className="h-5 w-5 text-qm-blue" />
          </button>
        </div>
      </header>

      {activeFile && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/80 px-4 py-2">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-qm-green" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-qm-navy">{activeFile.name}</span>
          <span className="text-[10px] text-slate-500">{activeFile.rows} rows</span>
          <button type="button" onClick={() => setActiveFileId(null)} className="p-1">
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      )}

      <div ref={viewportRef} className="scroll-touch min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-qm-blue to-violet-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-qm-navy">Ask about your data</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Attach a file from the Files tab, then ask questions here.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 active:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-qm-blue px-4 py-2.5 text-[14px] text-white">
                    {m.content}
                  </div>
                ) : (
                  <div className="flex max-w-[92%] gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                      <MarkdownView>{m.content}</MarkdownView>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {files.length > 0 && !activeFile && (
        <div className="border-t border-slate-100 bg-white px-4 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Attach dataset</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFileId(f.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {f.name.length > 18 ? `${f.name.slice(0, 16)}…` : f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="composer-bar shrink-0 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message AviaAgent…"
            className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => void send()}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-qm-blue text-white disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-40 flex">
          <button type="button" className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} aria-label="Close" />
          <div className="safe-top safe-bottom flex w-[min(100%,320px)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-qm-navy">Chat history</h2>
              <button type="button" onClick={() => setShowHistory(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chats.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No chats yet</p>}
              {chats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCurrentId(c.id); setShowHistory(false) }}
                  className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${c.id === currentId ? 'bg-blue-50 ring-1 ring-qm-blue/30' : 'hover:bg-slate-50'}`}
                >
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-[10px] text-slate-400">{new Date(c.updatedAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
