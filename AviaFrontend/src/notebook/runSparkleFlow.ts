import { AI_API, API, apiFetch } from '@/lib/api'
import { readGeminiModel } from '@/lib/geminiModel'
import { pollExecution } from './pollExecution'
import type { NotebookCell } from './types'

const MAX_CRITIC = 4

export async function runSparkleFlow(
  prompt: string,
  inputObjects: string[],
  onStep?: (phase: string, status: string, detail?: Record<string, unknown>) => void,
  model?: string,
  targetCellId?: string,
): Promise<NotebookCell> {
  const geminiModel = model || readGeminiModel()
  const cellId = targetCellId || crypto.randomUUID()
  let criticFeedback = ''
  let code = ''
  let reasoning = ''
  let codeExplanation = ''
  let runResult: Record<string, unknown> = {}
  let executionId = ''
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
        model: geminiModel,
      }),
    })
    const gen = await genRes.json()
    code = gen.code || ''
    reasoning = gen.reasoning || reasoning
    codeExplanation = gen.code_explanation || gen.explanation || codeExplanation
    onStep?.('codegen', 'completed', { reasoning, code_explanation: codeExplanation, code })
    onStep?.('run', 'running')
    const runRes = await apiFetch(`${API}/python-compiler/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, input_objects: inputObjects, cell_id: cellId }),
    })
    const { execution_id } = await runRes.json()
    executionId = execution_id
    runResult = await pollExecution(execution_id)
    onStep?.('run', runResult.status as string)
    onStep?.('critic', 'running')
    const criticRes = await apiFetch(`${API}/python-compiler/critic-evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, run_result: runResult, prompt, model: geminiModel }),
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
    body: JSON.stringify({ prompt, run_result: runResult, model: geminiModel }),
  })
  const fa = await faRes.json()
  onStep?.('final_answer', 'completed')
  return {
    cellId,
    cellNumber: 0,
    cellType: 'code',
    prompt,
    code,
    reasoning,
    codeExplanation,
    runResult,
    finalAnswer: fa.final_answer,
    chartObjects: fa.chart_objects,
    executionId: (runResult.execution_id as string | undefined) || executionId,
    messageId: cellId,
    status: runResult.status === 'completed' ? 'completed' : 'failed',
    timestamp: Date.now(),
  }
}
