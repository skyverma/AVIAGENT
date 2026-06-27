import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DataFramePreview = {
  columns?: string[]
  rows?: Record<string, unknown>[]
  total_rows?: number
  preview_rows?: number
}

const PAGE_SIZE = 10

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString()
    return Number(value.toFixed(4)).toString()
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function DataFrameTable({ name, preview }: { name: string; preview: DataFramePreview }) {
  const [page, setPage] = useState(0)
  const rows = preview.rows || []
  const columns = useMemo(() => {
    if (preview.columns?.length) return preview.columns
    return rows.length ? Object.keys(rows[0]) : []
  }, [preview.columns, rows])

  const totalRows = preview.total_rows ?? rows.length
  const previewRows = preview.preview_rows ?? rows.length
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  const shortName = name.split('/').pop() || name

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <Table2 className="h-3.5 w-3.5 text-qm-blue" />
        <span className="truncate text-[11px] font-semibold text-qm-navy">{shortName}</span>
        <span className="text-[10px] text-slate-400">
          {totalRows.toLocaleString()} rows × {columns.length} cols
          {previewRows < totalRows && ` · previewing ${previewRows}`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50/80 px-2 py-1.5 text-right font-mono text-[10px] text-slate-400">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-b border-slate-200 px-3 py-1.5 text-left font-semibold text-qm-navy"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={start + i} className={cn(i % 2 === 1 && 'bg-slate-50/40')}>
                <td className="sticky left-0 z-10 border-r border-slate-100 bg-inherit px-2 py-1 text-right font-mono text-[10px] text-slate-400">
                  {start + i}
                </td>
                {columns.map((col) => (
                  <td key={col} className="max-w-[220px] truncate whitespace-nowrap px-3 py-1 text-slate-700" title={formatCell(row[col])}>
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-1.5">
          <span className="text-[10px] text-slate-400">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
