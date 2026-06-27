import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUp,
  ChartBar,
  FileSpreadsheet,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Sparkles,
  Trash2,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react'
import { MarkdownView } from '@/lib/markdown'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { API, apiFetch } from '@/lib/api'
import { llmPayload } from '@/lib/llmConfig'
import { LlmSelector, useLlmSelection } from '@/components/LlmSelector'
import { PipelineProgress, type PipelineStep } from '@/components/PipelineProgress'
import { cn } from '@/lib/utils'

type ChartObject = {
  type?: 'bar' | 'line' | 'pie' | string
  title?: string
  data?: Record<string, unknown>[]
  xKey?: string
  yKey?: string
}

type ChatMsg = { role: 'user' | 'assistant'; content: string; mode?: 'direct' | 'compiler'; charts?: ChartObject[] }

type Chat = { id: string; title: string; messages: ChatMsg[]; updatedAt: number }

type AttachedFile = { object_name: string; label: string; rows: number; columns: number }

const CHATS_KEY = 'avia-normal-chats'

function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const SUGGESTIONS = [
  { icon: ChartBar, label: 'Summarize dataset', prompt: 'Give me a clear summary of this dataset with key statistics.' },
  { icon: TrendingUp, label: 'Trend analysis', prompt: 'Analyze trends over time in this dataset and explain what is driving them.' },
  { icon: Sparkles, label: 'Find correlations', prompt: 'Find the strongest correlations between columns and explain them.' },
  { icon: Wand2, label: 'Detect outliers', prompt: 'Detect outliers and anomalies in the data and describe them.' },
]

const COLORS = ['#2d8cff', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#14b8a6']

function firstKey(row: Record<string, unknown>, fallback: string) {
  return Object.keys(row).find((key) => typeof row[key] === 'string') || Object.keys(row)[0] || fallback
}

function numericKey(row: Record<string, unknown>, fallback: string) {
  return Object.keys(row).find((key) => typeof row[key] === 'number') || Object.keys(row)[1] || fallback
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}

function ChartCard({ chart }: { chart: ChartObject }) {
  const data = Array.isArray(chart.data) ? chart.data : []
  if (data.length === 0) return null
  const first = data[0] || {}
  const xKey = chart.xKey || firstKey(first, 'name')
  const yKey = chart.yKey || numericKey(first, 'value')
  const type = chart.type || 'bar'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-qm-navy">
        <ChartBar className="h-4 w-4 text-qm-blue" />
        {chart.title || 'Analysis chart'}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#2d8cff" strokeWidth={2} dot={false} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={92}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={yKey} fill="#2d8cff" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ThinkingBubble({ hasFile }: { hasFile: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="flex max-w-[90%] gap-3"
    >
      <div className="avatar-glow mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
        <span className="shimmer-text text-xs font-medium">
          {hasFile ? 'Running analysis pipeline' : 'Thinking'}…
        </span>
      </div>
    </motion.div>
  )
}

export function NormalModePage() {
  const [input, setInput] = useState('')
  const [agentInstruction, setAgentInstruction] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [file, setFile] = useState<AttachedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [llm, setLlm] = useLlmSelection()
  const [chats, setChats] = useState<Chat[]>(loadChats)
  const [currentId, setCurrentId] = useState<string>(() => loadChats()[0]?.id || crypto.randomUUID())
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const messages = chats.find((c) => c.id === currentId)?.messages ?? []

  useEffect(() => {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
    } catch {
      /* ignore */
    }
  }, [chats])

  const setMessages = (updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => {
    setChats((prev) => {
      let list = prev
      if (!prev.some((c) => c.id === currentId)) {
        list = [{ id: currentId, title: 'New chat', messages: [], updatedAt: Date.now() }, ...prev]
      }
      return list.map((c) => {
        if (c.id !== currentId) return c
        const newMsgs = typeof updater === 'function' ? updater(c.messages) : updater
        const firstUser = newMsgs.find((mm) => mm.role === 'user')
        const title = c.title && c.title !== 'New chat'
          ? c.title
          : firstUser
            ? firstUser.content.slice(0, 44)
            : 'New chat'
        return { ...c, messages: newMsgs, title, updatedAt: Date.now() }
      })
    })
  }

  const newChat = () => {
    setCurrentId(crypto.randomUUID())
    setInput('')
    setFile(null)
    setSteps([])
  }

  const selectChat = (id: string) => {
    if (id === currentId) return
    setCurrentId(id)
    setSteps([])
    setInput('')
  }

  const deleteChat = (id: string) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (id === currentId) setCurrentId(next[0]?.id || crypto.randomUUID())
      return next
    })
  }

  const uploadFile = async (f: File) => {
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await apiFetch(`${API}/uploads/dataframe`, { method: 'POST', body: fd })
      const data = await res.json()
      setFile({ object_name: data.object_name, label: data.label, rows: data.rows, columns: data.columns })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const scrollDown = () => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const analyze = async (promptArg?: string) => {
    const prompt = (promptArg ?? input).trim()
    if (!prompt || loading) return
    const shouldRunCompiler = Boolean(file?.object_name)
    setInput('')
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', content: prompt }])
    scrollDown()
    setSteps(shouldRunCompiler ? [
      { id: 'planning', name: 'Planning', status: 'running' },
      { id: 'codegen', name: 'Codegen', status: 'pending' },
      { id: 'run', name: 'Run', status: 'pending' },
      { id: 'critic', name: 'Critic', status: 'pending' },
      { id: 'final_answer', name: 'Final answer', status: 'pending' },
    ] : [])
    try {
      const res = await fetch(`${API}/normal/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_prompt: prompt,
          agent_instruction: agentInstruction,
          dataframe_path: file?.object_name || '',
          ...llmPayload(llm),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalMd = ''
      let finalMode: 'direct' | 'compiler' = shouldRunCompiler ? 'compiler' : 'direct'
      let finalCharts: ChartObject[] = []
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payload = JSON.parse(part.slice(6))
          if (payload.type === 'step' && payload.step) {
            const s = payload.step
            setSteps((prev) => {
              const ids = ['planning', 'codegen', 'run', 'critic', 'final_answer']
              const idx = ids.indexOf(s.id)
              return prev.map((p, i) => {
                if (p.id === s.id) return { ...p, status: s.status === 'completed' ? 'completed' : s.status === 'failed' ? 'failed' : 'running', detail: s.detail }
                if (idx >= 0 && i < idx && p.status !== 'completed') return { ...p, status: 'completed' }
                return p
              })
            })
          }
          if (payload.type === 'complete') {
            finalMd = payload.result?.final_answer || ''
            finalMode = payload.result?.mode === 'compiler' ? 'compiler' : 'direct'
            finalCharts = Array.isArray(payload.result?.chart_objects) ? payload.result.chart_objects : []
          }
        }
      }
      setMessages((m) => [...m, {
        role: 'assistant',
        content: finalMd || 'Analysis complete.',
        mode: finalMode,
        charts: finalCharts,
      }])
      setSteps((prev) => prev.map((p) => ({ ...p, status: p.status === 'running' ? 'completed' : p.status })))
      scrollDown()
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e}` }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)

  const composer = (
    <div className="w-full">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 transition-all focus-within:border-qm-blue focus-within:ring-4 focus-within:ring-qm-blue/10">
        {file && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-qm-navy">
              <FileSpreadsheet className="h-4 w-4 text-qm-green" />
              <span className="font-medium">{file.label}</span>
              <span className="text-slate-400">{file.rows.toLocaleString()} rows · {file.columns} cols</span>
              <button type="button" onClick={() => setFile(null)} className="ml-1 rounded-full p-0.5 hover:bg-slate-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        {showAdvanced && (
          <div className="px-4 pt-3">
            <textarea
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700 focus:outline-none"
              rows={3}
              placeholder="Methodology / code hints (optional) — paste structured requirements or agent instructions…"
              value={agentInstruction}
              onChange={(e) => setAgentInstruction(e.target.value)}
            />
          </div>
        )}
        <textarea
          className="max-h-48 min-h-[52px] w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm text-qm-navy placeholder:text-slate-400 focus:outline-none"
          rows={1}
          placeholder="Ask anything about your data…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              analyze()
            }
          }}
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Attach CSV / XLSX / Parquet"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-qm-navy disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Paperclip className="h-[18px] w-[18px]" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".csv,.txt,.xlsx,.xls,.parquet"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            <LlmSelector value={llm} onChange={setLlm} compact />
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                showAdvanced ? 'bg-qm-blue/10 text-qm-blue' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              Advanced
            </button>
          </div>
          <button
            type="button"
            onClick={() => analyze()}
            disabled={loading || !input.trim()}
            title="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-qm-blue text-white transition-opacity hover:bg-qm-blue/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
      {uploadError && <p className="mt-2 px-2 text-xs text-red-500">{uploadError}</p>}
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* ── Chat history sidebar ── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
        <div className="p-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-qm-blue px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-qm-blue/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </button>
        </div>
        <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Chat history
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {sortedChats.length === 0 && (
            <p className="px-2 py-3 text-center text-[11px] text-slate-400">No conversations yet</p>
          )}
          {sortedChats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectChat(c.id)}
              className={cn(
                'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                c.id === currentId ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70',
              )}
            >
              <Pencil className={cn('h-3.5 w-3.5 shrink-0', c.id === currentId ? 'text-qm-blue' : 'text-slate-400')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-qm-navy">{c.title || 'New chat'}</span>
                <span className="block text-[10px] text-slate-400">{relativeTime(c.updatedAt)}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); deleteChat(c.id) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteChat(c.id) } }}
                className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-qm-bg">
        {isEmpty ? (
          <div className="relative flex flex-1 flex-col items-center justify-center px-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-qm-blue/5 via-transparent to-transparent" />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-3xl"
            >
              <div className="mb-8 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  className="avatar-glow mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-qm-blue to-violet-500 shadow-lg"
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </motion.div>
                <h1 className="text-2xl font-semibold tracking-tight text-qm-navy">How can I help you today?</h1>
                <p className="mt-1.5 text-[13px] text-slate-500">Quick Analysis — attach a dataset and ask anything.</p>
              </div>
              {composer}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s.label}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                    whileHover={{ y: -2 }}
                    onClick={() => analyze(s.prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-qm-blue/40 hover:text-qm-navy hover:shadow"
                  >
                    <s.icon className="h-3.5 w-3.5 text-qm-blue" />
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            <div ref={viewportRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-4xl space-y-5 px-6 py-6">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {m.role === 'user' ? (
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-qm-blue px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-sm">
                        {m.content}
                      </div>
                    ) : (
                      <div className="flex max-w-[92%] gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <MarkdownView>{m.content}</MarkdownView>
                          {m.mode === 'compiler' && m.charts && m.charts.length > 0 && (
                            <div className="mt-4 grid gap-3">
                              {m.charts.map((chart, chartIndex) => (
                                <ChartCard key={chartIndex} chart={chart} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <AnimatePresence>
                  {loading && steps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mx-auto max-w-md"
                    >
                      <PipelineProgress steps={steps} />
                    </motion.div>
                  )}
                  {loading && steps.length === 0 && (
                    <div className="flex justify-start">
                      <ThinkingBubble hasFile={Boolean(file?.object_name)} />
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-qm-bg/80 px-6 py-3 backdrop-blur">
              <div className="mx-auto max-w-4xl">{composer}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
