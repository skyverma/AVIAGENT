import { loadPyodide, type PyodideInterface } from 'pyodide'

const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

let pyodideInstance: PyodideInterface | null = null
let loadPromise: Promise<PyodideInterface> | null = null

export async function getPyodide(onStatus?: (msg: string) => void): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    onStatus?.('Loading Python runtime (first time may take 30–60s)…')
    const pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX })
    onStatus?.('Installing pandas…')
    await pyodide.loadPackage(['pandas', 'numpy'])
    pyodideInstance = pyodide
    onStatus?.('Python ready')
    return pyodide
  })()

  return loadPromise
}

export async function runPythonOnData(opts: {
  code: string
  rows: Record<string, unknown>[]
  onStatus?: (msg: string) => void
}): Promise<{ stdout: string; stderr: string; error?: string }> {
  const { code, rows, onStatus } = opts
  const pyodide = await getPyodide(onStatus)

  pyodide.runPython(`
import sys
from io import StringIO
_stdout = StringIO()
_stderr = StringIO()
sys.stdout = _stdout
sys.stderr = _stderr
`)

  const jsonData = JSON.stringify(rows)
  pyodide.globals.set('_user_rows_json', jsonData)
  pyodide.globals.set('_user_code', code)

  try {
    await pyodide.runPythonAsync(`
import pandas as pd
import json

_rows = json.loads(_user_rows_json)
df = pd.DataFrame(_rows)

# User code (use df variable)
exec(_user_code, {'df': df, 'pd': pd})
`)
    const stdout = pyodide.runPython('_stdout.getvalue()') as string
    const stderr = pyodide.runPython('_stderr.getvalue()') as string
    return { stdout: stdout || '(no output)', stderr }
  } catch (e) {
    const stdout = pyodide.runPython('_stdout.getvalue()') as string
    const stderr = pyodide.runPython('_stderr.getvalue()') as string
    const msg = e instanceof Error ? e.message : String(e)
    return { stdout, stderr, error: msg }
  }
}
