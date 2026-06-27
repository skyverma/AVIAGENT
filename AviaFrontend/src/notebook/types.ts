export type CellResultView = 'insights' | 'dataframes' | 'charts' | 'code' | 'logs'

export type AiPipelineLiveState = {
  phase: string
  status: 'running' | 'completed' | 'failed'
  detail?: string
}

export type PythonCompilerGenerationEntry = {
  cellId: string
  cellNumber: number
  prompt: string
  code: string
  runResult?: Record<string, unknown>
  finalAnswer?: string
  chartObjects?: Record<string, unknown>[]
  executionId?: string
  aiPipelineLive?: AiPipelineLiveState
  messageId?: string
}

export type NotebookSettings = {
  generationHistory: PythonCompilerGenerationEntry[]
  activeDataframe?: string
  sessionId: string
}
