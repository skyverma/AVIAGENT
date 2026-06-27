import { AI_API, API, apiFetch } from '@/lib/api'
import { llmPayload, readLlmSelection, type LlmSelection } from '@/lib/llmConfig'
import type { PythonCompilerGenerationEntry } from './types'

const MAX_CRITIC = 4

async function pollExecution(executionId: string) {
  for (let i = 0; i < 400; i++) {
    const res = await apiFetch(`${API}/python-compiler/executions/${executionId}`)
    const data = await res.json()
    if (data.status === 'completed' || data.status === 'failed') return data
    await new Promise((r) => setTimeout(r, 800))
  }
  throw new Error('Execution timeout')
}

export async function runSparkleFlow(
  prompt: string,
  inputObjects: string[],
  onStep?: (phase: string, status: string) => void,
  llm?: LlmSelection,
): Promise<PythonCompilerGenerationEntry> {
  const selection = llm || readLlmSelection()
  const llmFields = llmPayload(selection)
  const cellId = crypto.randomUUID()
  let criticFeedback = ''
  let code = ''
  let runResult: Record<string, unknown> = {}
  for (let attempt = 1; attempt <= MAX_CRITIC; attempt++) {
    onStep?.('codegen', 'running')
    const genRes = await apiFetch(`${AI_API}/python-compiler/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        critic_feedback: criticFeedback,
        use_memory: true,
        session_id: cellId,
        ...llmFields,
      }),
    })
    const gen = await genRes.json()
    code = gen.code || ''
    onStep?.('codegen', 'completed')
    onStep?.('run', 'running')
    const runRes = await apiFetch(`${API}/python-compiler/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, input_objects: inputObjects, cell_id: cellId }),
    })
    const { execution_id } = await runRes.json()
    runResult = await pollExecution(execution_id)
    onStep?.('run', runResult.status as string)
    onStep?.('critic', 'running')
    const criticRes = await apiFetch(`${API}/python-compiler/critic-evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, run_result: runResult, prompt, ...llmFields }),
    })
    const critic = await criticRes.json()
    onStep?.('critic', 'completed')
    if (critic.approved) break
    criticFeedback = critic.feedback || ''
  }
  onStep?.('final_answer', 'running')
  const faRes = await apiFetch(`${API}/python-compiler/final-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, run_result: runResult, ...llmFields }),
  })
  const fa = await faRes.json()
  onStep?.('final_answer', 'completed')
  return {
    cellId,
    cellNumber: 0,
    prompt,
    code,
    runResult,
    finalAnswer: fa.final_answer,
    chartObjects: fa.chart_objects,
    executionId: runResult.execution_id as string | undefined,
    messageId: cellId,
  }
}
