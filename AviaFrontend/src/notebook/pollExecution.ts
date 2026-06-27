import { API, apiFetch } from '@/lib/api'

export async function pollExecution(executionId: string) {
  for (let i = 0; i < 400; i++) {
    const res = await apiFetch(`${API}/python-compiler/executions/${executionId}`)
    const data = await res.json()
    if (data.status === 'completed' || data.status === 'failed') return data
    await new Promise((r) => setTimeout(r, 800))
  }
  throw new Error('Execution timeout')
}
