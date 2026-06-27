import { useRef, useState } from 'react'
import {
  ArrowUp,
  ChartBar,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Sparkles,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { API, apiFetch } from '@/lib/api'
import { GEMINI_MODELS, readGeminiModel, writeGeminiModel } from '@/lib/geminiModel'
import { PipelineProgress, type PipelineStep } from '@/components/PipelineProgress'
import { cn } from '@/lib/utils'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

type AttachedFile = { object_name: string; label: string; rows: number; columns: number }

const SUGGESTIONS = [
  { icon: ChartBar, label: 'Summarize dataset', prompt: 'Give me a clear summary of this dataset with key statistics.' },
  { icon: TrendingUp, label: 'Trend analysis', prompt: 'Analyze trends over time in this dataset and explain what is driving them.' },
  { icon: Sparkles, label: 'Find correlations', prompt: 'Find the strongest correlations between columns and explain them.' },
  { icon: Wand2, label: 'Detect outliers', prompt: 'Detect outliers and anomalies in the data and describe them.' },
]

export function NormalModePage() {
  const [input, setInput] = useState('')
  const [agentInstruction, setAgentInstruction] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [file, setFile] = useState<AttachedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [model, setModel] = useState(readGeminiModel)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const onModelChange = (id: string) => {
    setModel(id)
    writeGeminiModel(id)
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
    setInput('')
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', content: prompt }])
    scrollDown()
    setSteps([
      { id: 'planning', name: 'Planning', status: 'running' },
      { id: 'codegen', name: 'Codegen', status: 'pending' },
      { id: 'run', name: 'Run', status: 'pending' },
      { id: 'critic', name: 'Critic', status: 'pending' },
      { id: 'final_answer', name: 'Final answer', status: 'pending' },
    ])
    try {
      const res = await fetch(`${API}/normal/analyze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_prompt: prompt,
          agent_instruction: agentInstruction,
          dataframe_path: file?.object_name || '',
          model,
        }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalMd = ''
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
          if (payload.type === 'complete') finalMd = payload.result?.final_answer || ''
        }
      }
      setMessages((m) => [...m, { role: 'assistant', content: finalMd || 'Analysis complete.' }])
      setSteps((prev) => prev.map((p) => ({ ...p, status: p.status === 'running' ? 'completed' : p.status })))
      scrollDown()
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e}` }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

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
          className="max-h-48 min-h-[56px] w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] text-qm-navy placeholder:text-slate-400 focus:outline-none"
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
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1">
              <Sparkles className="ml-1.5 h-3.5 w-3.5 text-violet-500" />
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="cursor-pointer bg-transparent pr-1 text-xs font-medium text-qm-navy focus:outline-none"
                title="Model"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
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

  if (isEmpty) {
    return (
      <div className="relative flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-qm-blue/5 via-transparent to-transparent" />
        <div className="relative z-10 w-full max-w-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-qm-blue to-violet-500 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-qm-navy">How can I help you today?</h1>
            <p className="mt-2 text-sm text-slate-500">Quick Analysis — attach a dataset and ask anything.</p>
          </div>
          {composer}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => analyze(s.prompt)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-qm-blue/40 hover:text-qm-navy hover:shadow"
              >
                <s.icon className="h-3.5 w-3.5 text-qm-blue" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div ref={viewportRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'user' ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-qm-blue px-4 py-2.5 text-sm text-white shadow-sm">
                  {m.content}
                </div>
              ) : (
                <div className="flex max-w-[90%] gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="prose prose-sm max-w-none rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && steps.length > 0 && (
            <div className="mx-auto max-w-md">
              <PipelineProgress steps={steps} />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 bg-qm-bg/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">{composer}</div>
      </div>
    </div>
  )
}
