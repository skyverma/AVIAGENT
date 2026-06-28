import { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2, Trash2, Upload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { parseDataFile } from '@/lib/csv'

export function FilesPage() {
  const { files, setFiles } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = async (file: File) => {
    setError('')
    setLoading(true)
    try {
      const parsed = await parseDataFile(file)
      await setFiles((prev) => [parsed, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (id: string) => {
    await setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="app-page">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base font-bold text-qm-navy">My files</h1>
        <p className="text-[11px] text-slate-400">Stored on this device only</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-qm-blue/40 bg-white py-8 text-qm-blue active:bg-blue-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="font-semibold">{loading ? 'Parsing…' : 'Upload CSV or Excel'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void onPick(e.target.files[0])}
        />
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {files.length === 0 ? (
          <p className="text-center text-sm text-slate-400">No files yet. Upload a spreadsheet to analyze.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
                  <FileSpreadsheet className="h-5 w-5 text-qm-green" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-qm-navy">{f.name}</div>
                  <div className="text-xs text-slate-500">
                    {f.rows.toLocaleString()} rows · {f.columns} columns
                  </div>
                </div>
                <button type="button" onClick={() => void remove(f.id)} className="rounded-lg p-2 text-slate-400 active:bg-red-50 active:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
