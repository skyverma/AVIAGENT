import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Code2, FileSpreadsheet, Loader2, Paperclip, Plus, Send, Sparkles, Type, X,
} from 'lucide-react'
import { MarkdownView } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { API, apiFetch } from '@/lib/api'
import { LlmSelector, useLlmSelection } from '@/components/LlmSelector'
import { CellInsertZone } from '@/notebook/CellInsertZone'
import {
  createCell, deleteCellAt, insertCellAfter, renumberCells, updateCell,
} from '@/notebook/cellUtils'
import { NotebookCell } from '@/notebook/NotebookCell'
import { runCellCode } from '@/notebook/runCellCode'
import { runSparkleFlow } from '@/notebook/runSparkleFlow'
import type { CellResultView, NotebookCell as Cell, NotebookCellType } from '@/notebook/types'

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; cellId?: string; kind?: 'reasoning' | 'error' }

function ThinkingBubble({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5"
    >
      <div className="avatar-glow flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
        <span className="shimmer-text text-[11px] font-medium">{label}…</span>
      </div>
    </motion.div>
  )
}

export function NotebookPage() {
  const sessionId = useRef(crypto.randomUUID()).current
  const chatRef = useRef<HTMLDivElement>(null)
  const notebookRef = useRef<HTMLDivElement>(null)

  const [llm, setLlm] = useLlmSelection()
  const [cells, setCells] = useState<Cell[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [aiTargetCellId, setAiTargetCellId] = useState<string | null>(null)
  const [viewModes, setViewModes] = useState<Record<string, CellResultView>>({})
  const [runningCellId, setRunningCellId] = useState<string | null>(null)
  const [hoveredGap, setHoveredGap] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [livePhase, setLivePhase] = useState('')
  const [dataframe, setDataframe] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const persist = useCallback((nextCells: Cell[], extra?: Record<string, unknown>) => {
    apiFetch(`${API}/notebook/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        generation_history: nextCells,
        settings: {
          activeCellIndex: activeIndex,
          aiTargetCellId,
          activeDataframe: dataframe,
          ...extra,
        },
      }),
    }).catch(() => {})
  }, [sessionId, activeIndex, aiTargetCellId, dataframe])

  useEffect(() => {
    apiFetch(`${API}/notebook/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        const hist = data.generation_history ?? data.generationHistory
        if (hist?.length) {
          setCells(renumberCells(hist))
          setActiveIndex(data.settings?.activeCellIndex ?? hist.length - 1)
          setAiTargetCellId(data.settings?.aiTargetCellId ?? null)
          setDataframe(data.settings?.activeDataframe ?? '')
        } else {
          const first = createCell('code')
          setCells(renumberCells([first]))
        }
      })
      .catch(() => {
        setCells(renumberCells([createCell('code')]))
      })
  }, [sessionId])

  const scrollChat = () => {
    requestAnimationFrame(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }))
  }

  const scrollToCell = (cellId: string) => {
    requestAnimationFrame(() => {
      notebookRef.current?.querySelector(`[data-cell-id="${cellId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const addCell = (afterIndex: number, type: NotebookCellType = 'code') => {
    const { cells: next, newIndex } = insertCellAfter(cells, afterIndex, type)
    setCells(next)
    setActiveIndex(newIndex)
    persist(next, { activeCellIndex: newIndex })
    scrollToCell(next[newIndex].cellId)
  }

  const deleteCell = (index: number) => {
    const { cells: next, newIndex } = deleteCellAt(cells, index)
    setCells(next)
    setActiveIndex(newIndex)
    if (aiTargetCellId && !next.find((c) => c.cellId === aiTargetCellId)) setAiTargetCellId(null)
    persist(next, { activeCellIndex: newIndex })
  }

  const patchCell = (cellId: string, patch: Partial<Cell>) => {
    const next = updateCell(cells, cellId, patch)
    setCells(next)
    persist(next)
    return next
  }

  const runCell = async (cellId: string) => {
    const cell = cells.find((c) => c.cellId === cellId)
    if (!cell || cell.cellType !== 'code' || !cell.code.trim()) return
    setRunningCellId(cellId)
    patchCell(cellId, { status: 'running', runResult: undefined })
    setViewModes((v) => ({ ...v, [cellId]: 'logs' }))
    try {
      const result = await runCellCode(cell.code, dataframe ? [dataframe] : [], cellId)
      patchCell(cellId, {
        status: result.status === 'completed' ? 'completed' : 'failed',
        runResult: result,
        executionId: result.execution_id,
      })
      const hasFrames = result.previews && Object.keys(result.previews).length > 0
      setViewModes((v) => ({ ...v, [cellId]: hasFrames ? 'dataframes' : 'logs' }))
    } catch (e) {
      patchCell(cellId, { status: 'failed', runResult: { logs: String(e), status: 'failed' } })
    } finally {
      setRunningCellId(null)
    }
  }

  const uploadFile = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await apiFetch(`${API}/uploads/dataframe`, { method: 'POST', body: fd })
      const data = await res.json()
      setDataframe(data.object_name)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onSend = async () => {
    const prompt = input.trim()
    if (!prompt || loading) return
    setInput('')
    setLoading(true)
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: prompt }
    setMessages((m) => [...m, userMsg])
    scrollChat()

    const targetId = aiTargetCellId
    const targetCell = targetId ? cells.find((c) => c.cellId === targetId) : undefined
    const isUpdate = Boolean(targetCell)
    let workingCells = cells
    let placeholderId = targetId

    if (!isUpdate) {
      const { cells: withPlaceholder, newIndex } = insertCellAfter(cells, activeIndex, 'code')
      placeholderId = withPlaceholder[newIndex].cellId
      workingCells = withPlaceholder.map((c, i) =>
        i === newIndex ? { ...c, prompt, status: 'running' as const } : c,
      )
      setCells(workingCells)
      setActiveIndex(newIndex)
      setAiTargetCellId(placeholderId)
      scrollToCell(placeholderId!)
    } else {
      workingCells = updateCell(cells, targetId!, { prompt, status: 'running' })
      setCells(workingCells)
      scrollToCell(targetId!)
    }

    const phaseToView: Record<string, CellResultView> = {
      codegen: 'code',
      run: 'logs',
      critic: 'logs',
      final_answer: 'insights',
    }

    const assistantMsgId = placeholderId || crypto.randomUUID()

    try {
      const entry = await runSparkleFlow(
        prompt,
        dataframe ? [dataframe] : [],
        (phase, status, detail) => {
          setLivePhase(`${phase}: ${status}`)
          const v = phaseToView[phase]
          if (v && placeholderId) setViewModes((modes) => ({ ...modes, [placeholderId!]: v }))
          if (phase === 'codegen' && status === 'completed' && detail?.reasoning) {
            const reasoningText = String(detail.reasoning)
            if (placeholderId) setViewModes((modes) => ({ ...modes, [placeholderId!]: 'code_explanation' }))
            setMessages((m) => {
              const without = m.filter((msg) => msg.id !== assistantMsgId)
              return [...without, {
                id: assistantMsgId,
                role: 'assistant',
                content: reasoningText,
                cellId: placeholderId || undefined,
                kind: 'reasoning',
              }]
            })
            scrollChat()
          }
        },
        llm,
        placeholderId!,
      )
      const cellNum = workingCells.find((c) => c.cellId === placeholderId)?.cellNumber || workingCells.length
      const merged = updateCell(workingCells, placeholderId!, {
        ...entry,
        cellNumber: cellNum,
        prompt,
        status: entry.status || 'completed',
      })
      setCells(merged)
      persist(merged)
      setMessages((m) => {
        const without = m.filter((msg) => msg.id !== assistantMsgId)
        const reasoningText = entry.reasoning?.trim()
        return [...without, {
          id: assistantMsgId,
          role: 'assistant',
          content: reasoningText || 'Analysis complete. See Insights tab for results.',
          cellId: entry.cellId,
          kind: 'reasoning',
        }]
      })
      setViewModes((v) => ({ ...v, [entry.cellId]: 'insights' }))
      setAiTargetCellId(null)
      scrollChat()
    } catch (e) {
      const failed = updateCell(workingCells, placeholderId!, { status: 'failed' })
      setCells(failed)
      persist(failed)
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: String(e) }])
    } finally {
      setLoading(false)
      setLivePhase('')
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* ── Chat panel (Trinity split-screen) ── */}
      <motion.div
        initial={{ width: '38%' }}
        animate={{ width: '38%' }}
        className="flex shrink-0 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-qm-navy">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Notebook AI
          </div>
          <LlmSelector value={llm} onChange={setLlm} compact />
        </div>

        {/* Dataframe attach */}
        <div className="border-b border-slate-100 px-4 py-2">
          {dataframe ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px]">
              <FileSpreadsheet className="h-3.5 w-3.5 text-qm-green" />
              <span className="flex-1 truncate text-qm-navy">{dataframe.split('/').pop()}</span>
              <button type="button" onClick={() => setDataframe('')} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-500 hover:border-qm-blue hover:text-qm-blue"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
              Attach dataset (CSV / XLSX)
            </button>
          )}
          <input ref={fileRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.parquet" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
        </div>

        {/* Chat messages */}
        <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-2 h-8 w-8 text-violet-300" />
              <p className="text-[13px] font-medium text-qm-navy">Ask AI to generate cells</p>
              <p className="mt-1 text-[11px] text-slate-400">Or add cells manually on the right and run them yourself.</p>
            </div>
          )}
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-qm-blue px-3 py-2 text-[12.5px] leading-relaxed text-white">
                  {m.content}
                </div>
              ) : (
                <div className="flex max-w-[90%] gap-2">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-qm-blue to-violet-500">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    {m.kind === 'reasoning' ? (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">Plan</span>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">{m.content}</p>
                      </div>
                    ) : (
                      <MarkdownView>{m.content}</MarkdownView>
                    )}
                    {m.cellId && (
                      <button
                        type="button"
                        onClick={() => scrollToCell(m.cellId!)}
                        className="mt-1.5 text-[10px] font-medium text-qm-blue hover:underline"
                      >
                        Go to cell →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          <AnimatePresence>
            {loading && <ThinkingBubble label={livePhase || 'Generating cell'} />}
          </AnimatePresence>
        </div>

        {/* Chat input */}
        <div className="border-t border-slate-100 p-3">
          {aiTargetCellId && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-[10px] text-violet-700">
              <Sparkles className="h-3 w-3" />
              Updating cell {cells.find((c) => c.cellId === aiTargetCellId)?.cellNumber}
              <button type="button" onClick={() => setAiTargetCellId(null)} className="ml-auto text-violet-400 hover:text-violet-600"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:border-qm-blue focus-within:ring-2 focus-within:ring-qm-blue/10">
            <textarea
              className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] text-qm-navy placeholder:text-slate-400 focus:outline-none"
              rows={1}
              placeholder="Ask AI to analyze…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full bg-qm-blue text-white disabled:opacity-30"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Notebook canvas ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f8f9fb]">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
          <span className="text-[13px] font-semibold text-qm-navy">Notebook</span>
          <span className="text-[10px] text-slate-400">{cells.length} cell{cells.length !== 1 ? 's' : ''}</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => addCell(cells.length - 1, 'code')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-qm-blue hover:text-qm-blue"
          >
            <Code2 className="h-3.5 w-3.5" /> Code
          </button>
          <button
            type="button"
            onClick={() => addCell(cells.length - 1, 'markdown')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-qm-blue hover:text-qm-blue"
          >
            <Type className="h-3.5 w-3.5" /> Text
          </button>
          <button
            type="button"
            onClick={() => addCell(activeIndex, 'code')}
            className="inline-flex items-center gap-1 rounded-lg bg-qm-blue px-2.5 py-1 text-[11px] font-medium text-white hover:bg-qm-blue/90"
          >
            <Plus className="h-3.5 w-3.5" /> Insert below
          </button>
        </div>

        {/* Cell list */}
        <div ref={notebookRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mx-auto max-w-4xl space-y-0">
            {cells.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Code2 className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">No cells yet</p>
                <button type="button" onClick={() => addCell(-1)} className="mt-3 text-xs font-medium text-qm-blue hover:underline">
                  + Add your first cell
                </button>
              </div>
            )}
            {cells.map((cell, index) => (
              <div key={cell.cellId}>
                <NotebookCell
                  cell={cell}
                  isActive={index === activeIndex}
                  isTargeted={cell.cellId === aiTargetCellId}
                  isRunning={runningCellId === cell.cellId}
                  view={viewModes[cell.cellId] || (cell.finalAnswer ? 'insights' : 'code')}
                  onSelect={() => setActiveIndex(index)}
                  onToggleCollapse={() => patchCell(cell.cellId, { collapsed: !cell.collapsed })}
                  onDelete={() => deleteCell(index)}
                  onRun={() => runCell(cell.cellId)}
                  onSparkleTarget={() => {
                    setAiTargetCellId(cell.cellId === aiTargetCellId ? null : cell.cellId)
                    setActiveIndex(index)
                  }}
                  onCodeChange={(code) => patchCell(cell.cellId, { code })}
                  onMarkdownChange={(md) => patchCell(cell.cellId, { markdown: md })}
                  onViewChange={(v) => setViewModes((modes) => ({ ...modes, [cell.cellId]: v }))}
                />
                <CellInsertZone
                  gapId={`gap-${index}`}
                  hoveredGapId={hoveredGap}
                  onHover={setHoveredGap}
                  onInsert={() => addCell(index, 'code')}
                  alwaysVisible={index === cells.length - 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
