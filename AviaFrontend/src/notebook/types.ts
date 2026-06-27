export type CellResultView = 'insights' | 'dataframes' | 'code' | 'code_explanation' | 'logs'

export type NotebookCellType = 'code' | 'markdown'

export type CellStatus = 'idle' | 'running' | 'completed' | 'failed'

export type AiPipelineLiveState = {
  phase: string
  status: 'running' | 'completed' | 'failed'
  detail?: string
}

export type NotebookCell = {
  cellId: string
  cellNumber: number
  cellType: NotebookCellType
  prompt: string
  code: string
  markdown?: string
  collapsed?: boolean
  status?: CellStatus
  runResult?: Record<string, unknown>
  finalAnswer?: string
  reasoning?: string
  codeExplanation?: string
  chartObjects?: Record<string, unknown>[]
  executionId?: string
  aiPipelineLive?: AiPipelineLiveState
  messageId?: string
  timestamp?: number
}

/** @deprecated use NotebookCell */
export type PythonCompilerGenerationEntry = NotebookCell

export type NotebookSettings = {
  generationHistory: NotebookCell[]
  activeCellIndex?: number
  aiTargetCellId?: string
  activeDataframe?: string
  sessionId: string
}

export type ChartObject = {
  type?: 'bar' | 'line' | 'pie' | string
  title?: string
  data?: Record<string, unknown>[]
  xKey?: string
  yKey?: string
}
