import { useEffect, useRef } from 'react'
import {
  ChevronDown, ChevronRight, Loader2, Play, Sparkles, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownView } from '@/lib/markdown'
import { NotebookChart } from './NotebookChart'
import { DataFrameTable, type DataFramePreview } from './DataFrameTable'
import type { CellResultView, ChartObject, NotebookCell } from './types'

const TABS: { id: CellResultView; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'dataframes', label: 'Dataframes' },
  { id: 'code', label: 'Code' },
  { id: 'code_explanation', label: 'Code explanation' },
  { id: 'logs', label: 'Logs' },
]

const PANEL_HEIGHT = 'h-[340px]'

type Props = {
  cell: NotebookCell
  isActive: boolean
  isTargeted: boolean
  isRunning: boolean
  view: CellResultView
  onSelect: () => void
  onToggleCollapse: () => void
  onDelete: () => void
  onRun: () => void
  onSparkleTarget: () => void
  onCodeChange: (code: string) => void
  onMarkdownChange: (md: string) => void
  onViewChange: (view: CellResultView) => void
}

export function NotebookCell({
  cell, isActive, isTargeted, isRunning, view,
  onSelect, onToggleCollapse, onDelete, onRun, onSparkleTarget,
  onCodeChange, onMarkdownChange, onViewChange,
}: Props) {
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isActive && editorRef.current && cell.cellType === 'code') {
      editorRef.current.focus()
    }
  }, [isActive, cell.cellId, cell.cellType])

  const charts = (cell.chartObjects || []) as ChartObject[]
  const previews = (cell.runResult?.previews || {}) as Record<string, DataFramePreview>
  const previewEntries = Object.entries(previews)
  const meta = cell.runResult?.output_metadata as { object_name?: string; rows?: number; cols?: number }[] | undefined
  const busy = isRunning || cell.status === 'running'

  if (cell.cellType === 'markdown') {
    return (
      <div
        data-cell-id={cell.cellId}
        onClick={onSelect}
        className={cn(
          'group rounded-xl border bg-white transition-all',
          isActive ? 'border-qm-blue/50 shadow-md ring-2 ring-qm-blue/10' : 'border-slate-200 shadow-sm hover:border-slate-300',
        )}
      >
        <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleCollapse() }} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            {cell.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="text-[11px] font-semibold text-violet-500">Text {cell.cellNumber}</span>
          <div className="flex-1" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="rounded p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!cell.collapsed && (
          <textarea
            value={cell.markdown || ''}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className="min-h-[60px] w-full resize-y border-0 bg-slate-50 px-4 py-3 text-sm text-qm-navy focus:outline-none"
            placeholder="Markdown text cell…"
          />
        )}
        {!cell.collapsed && cell.markdown && (
          <div className="border-t border-slate-100 p-4">
            <MarkdownView>{cell.markdown || ''}</MarkdownView>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      data-cell-id={cell.cellId}
      onClick={onSelect}
      className={cn(
        'group rounded-xl border bg-white transition-all',
        isActive ? 'border-qm-blue/50 shadow-md ring-2 ring-qm-blue/10' : 'border-slate-200 shadow-sm hover:border-slate-300',
        isTargeted && 'ring-2 ring-violet-400/40',
      )}
    >
      {/* Cell toolbar */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-qm-navy"
          title={cell.collapsed ? 'Expand' : 'Collapse'}
        >
          {cell.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRun() }}
          disabled={busy}
          className="rounded p-1 text-qm-green hover:bg-green-50 disabled:opacity-40"
          title="Run cell (Shift+Enter)"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        </button>
        <span className="text-[11px] font-semibold text-qm-blue">Code {cell.cellNumber}</span>
        {cell.prompt && <span className="ml-1 truncate text-[10px] text-slate-400">— {cell.prompt.slice(0, 60)}</span>}
        {isTargeted && <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">AI target</span>}
        <div className="flex-1" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSparkleTarget() }}
          className={cn('rounded p-1 hover:bg-violet-50', isTargeted ? 'text-violet-600' : 'text-slate-400 hover:text-violet-500')}
          title="Set as AI target cell"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title="Delete cell"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {!cell.collapsed && (
        <>
          {/* Output tab strip — always visible, sits ABOVE the editor */}
          <div className="flex items-center gap-0.5 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-2 py-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewChange(t.id) }}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-semibold transition-colors',
                  view === t.id ? 'bg-qm-blue text-white shadow-sm' : 'text-slate-500 hover:bg-white',
                )}
              >
                {t.label}
                {busy && t.id === view && <span className="ml-1 inline-block h-1 w-1 animate-ping rounded-full bg-white" />}
              </button>
            ))}
          </div>

          {/* Tab content — all tabs share the same panel height */}
          <div className={cn(PANEL_HEIGHT, 'flex flex-col')}>
            {view === 'code' && (
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute bottom-0 left-0 top-0 z-10 flex w-8 items-start justify-center border-r border-slate-800/20 bg-[#1e1e1e] pt-3">
                  <span className="font-mono text-[10px] text-slate-500">{cell.cellNumber}</span>
                </div>
                <textarea
                  ref={editorRef}
                  value={cell.code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onRun() }
                  }}
                  spellCheck={false}
                  className="h-full w-full resize-none bg-[#1e1e1e] py-3 pl-10 pr-4 font-mono text-[12.5px] leading-relaxed text-[#d4d4d4] focus:outline-none"
                  placeholder="# Write Python here…  (Shift+Enter to run)"
                />
              </div>
            )}

            {view === 'insights' && (
              <div className="flex-1 overflow-auto bg-white p-4">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Insights</span>
                {busy ? (
                  <span className="shimmer-text text-xs font-medium">Generating insights…</span>
                ) : (
                  <MarkdownView emptyFallback="_Run the cell or ask AI to generate insights._">
                    {cell.finalAnswer || ''}
                  </MarkdownView>
                )}
                {/* Charts live under the insights */}
                {charts.length > 0 && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
                    <span className="text-[11px] font-semibold text-qm-navy">Charts</span>
                    {charts.map((c, i) => <NotebookChart key={i} chart={c} />)}
                  </div>
                )}
              </div>
            )}

            {view === 'code_explanation' && (
              <div className="flex-1 overflow-auto bg-white p-4">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Code walkthrough</span>
                {cell.codeExplanation ? (
                  <MarkdownView>{cell.codeExplanation}</MarkdownView>
                ) : (
                  <p className="text-xs text-slate-400">No code explanation yet. Ask AI to generate this cell.</p>
                )}
              </div>
            )}

            {view === 'logs' && (
              <pre className="flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] text-slate-600">
                {String(cell.runResult?.logs || (busy ? 'Executing…' : '_No logs yet._'))}
              </pre>
            )}

            {view === 'dataframes' && (
              <div className="flex-1 space-y-3 overflow-auto p-3">
                {previewEntries.length ? (
                  previewEntries.map(([name, preview]) => (
                    <DataFrameTable key={name} name={name} preview={preview} />
                  ))
                ) : meta?.length ? (
                  meta.map((o, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">
                      <span className="font-medium text-qm-navy">{o.object_name?.split('/').pop()}</span>
                      <span className="ml-2 text-slate-400">{o.rows?.toLocaleString()} rows · {o.cols} cols</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No output dataframes.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
