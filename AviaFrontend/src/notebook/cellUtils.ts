import type { NotebookCell, NotebookCellType } from './types'

export const DEFAULT_CODE = `import pandas as pd
import numpy as np

# DataFrames are available as df1, df2, ... from attached inputs.
# Print labeled results so they appear in the output panel.
`

export function createCell(type: NotebookCellType = 'code', prompt = ''): NotebookCell {
  const cellId = crypto.randomUUID()
  return {
    cellId,
    cellNumber: 0,
    cellType: type,
    prompt,
    code: type === 'code' ? DEFAULT_CODE : '',
    markdown: type === 'markdown' ? '' : undefined,
    collapsed: false,
    status: 'idle',
    timestamp: Date.now(),
  }
}

export function renumberCells(cells: NotebookCell[]): NotebookCell[] {
  return cells.map((c, i) => ({ ...c, cellNumber: i + 1 }))
}

export function insertCellAfter(cells: NotebookCell[], afterIndex: number, type: NotebookCellType = 'code'): { cells: NotebookCell[]; newIndex: number } {
  const cell = createCell(type)
  const next = [...cells]
  if (afterIndex < 0) {
    next.push(cell)
    return { cells: renumberCells(next), newIndex: next.length - 1 }
  }
  next.splice(afterIndex + 1, 0, cell)
  return { cells: renumberCells(next), newIndex: afterIndex + 1 }
}

export function deleteCellAt(cells: NotebookCell[], index: number): { cells: NotebookCell[]; newIndex: number } {
  if (cells.length <= 1) {
    return { cells: renumberCells([createCell()]), newIndex: 0 }
  }
  const next = cells.filter((_, i) => i !== index)
  const newIndex = Math.min(index, next.length - 1)
  return { cells: renumberCells(next), newIndex: Math.max(0, newIndex) }
}

export function updateCell(cells: NotebookCell[], cellId: string, patch: Partial<NotebookCell>): NotebookCell[] {
  return cells.map((c) => (c.cellId === cellId ? { ...c, ...patch, timestamp: Date.now() } : c))
}
