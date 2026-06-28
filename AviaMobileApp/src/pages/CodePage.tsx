import { useEffect, useRef, useState } from 'react'
import { Loader2, Play, Terminal } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { runPythonOnData } from '@/lib/pyodide'

const DEFAULT_CODE = `# df is your uploaded dataset (pandas DataFrame)
print("Shape:", df.shape)
print(df.head())
print(df.describe())`

export function CodePage() {
  const { files } = useApp()
  const [fileId, setFileId] = useState(files[0]?.id || '')
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('')
  const [running, setRunning] = useState(false)
  const outputRef = useRef<HTMLPreElement>(null)

  const file = files.find((f) => f.id === fileId) || files[0]

  useEffect(() => {
    if (files[0] && !fileId) setFileId(files[0].id)
  }, [files, fileId])

  const run = async () => {
    if (!file || running) return
    setRunning(true)
    setOutput('')
    setStatus('Starting…')
    try {
      const result = await runPythonOnData({
        code,
        rows: file.sampleRows,
        onStatus: setStatus,
      })
      const lines = [
        result.stdout && `--- stdout ---\n${result.stdout}`,
        result.stderr && `--- stderr ---\n${result.stderr}`,
        result.error && `--- error ---\n${result.error}`,
      ].filter(Boolean)
      setOutput(lines.join('\n\n') || 'Done (no output)')
      setStatus('')
      requestAnimationFrame(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    } catch (e) {
      setOutput(`Failed: ${e instanceof Error ? e.message : e}`)
      setStatus('')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-page">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-base font-bold text-qm-navy">Python</h1>
        <p className="text-[11px] text-slate-400">Runs on your phone via Pyodide (internet needed first load)</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4 space-y-3">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <Terminal className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">Upload a file in the Files tab first.</p>
          </div>
        ) : (
          <>
            <label className="block text-xs font-semibold text-slate-600">Dataset</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px]"
              value={file?.id || ''}
              onChange={(e) => setFileId(e.target.value)}
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.rows} rows)</option>
              ))}
            </select>
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Uses first {file?.sampleRows.length} rows on device for speed. Full file: use Chat AI.
            </p>

            <label className="block text-xs font-semibold text-slate-600">Python code</label>
            <textarea
              className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-green-400"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />

            <button
              type="button"
              disabled={running || !file}
              onClick={() => void run()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-qm-navy py-3.5 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-50"
            >
              {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              {running ? 'Running…' : 'Run Python'}
            </button>

            {status && (
              <p className="text-center text-xs text-qm-blue animate-pulse">{status}</p>
            )}

            {output && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">Output</p>
                <pre
                  ref={outputRef}
                  className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] text-slate-800"
                >
                  {output}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
