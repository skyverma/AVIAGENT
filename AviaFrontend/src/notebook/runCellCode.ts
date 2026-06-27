import { API, apiFetch } from '@/lib/api'
import { pollExecution } from './pollExecution'

export async function runCellCode(code: string, inputObjects: string[], cellId: string) {
  const runRes = await apiFetch(`${API}/python-compiler/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, input_objects: inputObjects, cell_id: cellId }),
  })
  const { execution_id } = await runRes.json()
  const result = await pollExecution(execution_id)
  return { ...result, execution_id }
}
