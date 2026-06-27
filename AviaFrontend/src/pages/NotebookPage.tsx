import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { CellResultView, NotebookSettings, PythonCompilerGenerationEntry } from '@/notebook/types'
import { runSparkleFlow } from '@/notebook/runSparkleFlow'
import { API, apiFetch } from '@/lib/api'
import { GEMINI_MODELS, readGeminiModel, writeGeminiModel } from '@/lib/geminiModel'

const TABS: { id: CellResultView; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'dataframes', label: 'Dataframes' },
  { id: 'charts', label: 'Charts' },
  { id: 'code', label: 'Code' },
  { id: 'logs', label: 'Logs' },
]

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; cellId?: string }

export function NotebookPage() {
  const [geminiModel, setGeminiModel] = useState(readGeminiModel)
  const sessionId = useRef(crypto.randomUUID()).current
  const [history, setHistory] = useState<PythonCompilerGenerationEntry[]>([])
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataframe, setDataframe] = useState('')
  const [viewModes, setViewModes] = useState<Record<string, CellResultView>>({})
  const [livePhase, setLivePhase] = useState('')

  useEffect(() => {
    apiFetch(`${API}/notebook/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data: NotebookSettings & { generation_history?: PythonCompilerGenerationEntry[] }) => {
        const hist = data.generationHistory ?? data.generation_history
        if (hist?.length) setHistory(hist)
      })
      .catch(() => {})
  }, [sessionId])

  const persist = useCallback((h: PythonCompilerGenerationEntry[]) => {
    apiFetch(`${API}/notebook/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, generation_history: h, settings: {} }),
    }).catch(() => {})
  }, [sessionId])

  const onSend = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: prompt }
    setMessages((m) => [...m, userMsg])
    try {
      const entry = await runSparkleFlow(prompt, dataframe ? [dataframe] : [], (phase: string, status: string) => {
        setLivePhase(`${phase}: ${status}`)
      }, geminiModel)
      entry.cellNumber = history.length + 1
      const next = [...history, entry]
      setHistory(next)
      persist(next)
      setMessages((m) => [...m, { id: entry.cellId, role: 'assistant', content: entry.finalAnswer || 'Done', cellId: entry.cellId }])
    } catch (e) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: String(e) }])
    } finally {
      setLoading(false)
      setLivePhase('')
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0 overflow-hidden">
      <motion.div
        initial={{ width: '35%' }}
        animate={{ width: '35%' }}
        className="flex shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-qm-navy">
            <Sparkles className="h-4 w-4 text-violet-500" /> Trinity Notebook AI
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <select
              value={geminiModel}
              onChange={(e) => { setGeminiModel(e.target.value); writeGeminiModel(e.target.value) }}
              className="cursor-pointer bg-transparent text-[11px] font-medium text-qm-navy focus:outline-none"
              title="Model"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-2">
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-qm-blue focus:outline-none"
            placeholder="Active dataframe MinIO path (optional)"
            value={dataframe}
            onChange={(e) => setDataframe(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className={cn('max-w-[95%] rounded-lg px-3 py-2 text-sm', m.role === 'user' ? 'chat-user ml-auto' : 'chat-assistant')}>
              {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-slate-500"><Loader2 className="inline h-3 w-3 animate-spin" /> {livePhase}</div>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
            placeholder="Ask Trinity to analyze…"
          />
          <button type="button" onClick={onSend} disabled={loading} className="rounded-lg bg-qm-blue px-3 text-white disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <h2 className="mb-4 text-lg font-bold text-qm-navy">Notebook cells</h2>
        {history.length === 0 && <p className="text-slate-500">No cells yet — use the chat to generate your first cell.</p>}
        {history.map((cell) => {
          const view = viewModes[cell.cellId] || 'insights'
          return (
            <div key={cell.cellId} data-cell-id={cell.cellId} className="avia-cell mb-4 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-qm-blue">Cell {cell.cellNumber}</span>
                <div className="flex gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setViewModes((v) => ({ ...v, [cell.cellId]: t.id }))}
                      className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', view === t.id ? 'bg-qm-blue text-white' : 'bg-slate-100 text-slate-600')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-sm text-slate-600">{cell.prompt}</p>
              {view === 'insights' && (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{cell.finalAnswer || '_No insights_'}</ReactMarkdown>
                </div>
              )}
              {view === 'code' && <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-green-300">{cell.code}</pre>}
              {view === 'logs' && <pre className="text-xs text-slate-600 whitespace-pre-wrap">{String(cell.runResult?.logs || '')}</pre>}
              {view === 'dataframes' && (
                <div className="text-xs">
                  {(cell.runResult?.output_metadata as { object_name?: string; rows?: number }[] | undefined)?.map((o, i) => (
                    <div key={i} className="mb-1 rounded border px-2 py-1">{o.object_name} — {o.rows} rows</div>
                  ))}
                </div>
              )}
              {view === 'charts' && (
                <pre className="text-xs">{JSON.stringify(cell.chartObjects, null, 2)}</pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
