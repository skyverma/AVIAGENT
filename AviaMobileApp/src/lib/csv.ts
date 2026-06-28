import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { StoredFile } from './types'

const SAMPLE_ROWS = 25

function toRecords(rows: Record<string, unknown>[]): {
  records: Record<string, unknown>[]
  columnNames: string[]
} {
  if (rows.length === 0) return { records: [], columnNames: [] }
  const columnNames = Object.keys(rows[0])
  return { records: rows.slice(0, SAMPLE_ROWS), columnNames }
}

function parseCsv(text: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })
  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message || 'CSV parse error')
  }
  return result.data
}

function parseExcel(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('No sheet found in workbook')
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
}

export async function parseDataFile(file: File): Promise<StoredFile> {
  const lower = file.name.toLowerCase()
  let allRows: Record<string, unknown>[]

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    allRows = parseCsv(await file.text())
  } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    allRows = parseExcel(await file.arrayBuffer())
  } else {
    throw new Error('Use CSV, XLSX, or XLS files')
  }

  if (allRows.length === 0) throw new Error('File has no data rows')

  const { records, columnNames } = toRecords(allRows)

  return {
    id: crypto.randomUUID(),
    name: file.name,
    rows: allRows.length,
    columns: columnNames.length,
    columnNames,
    sampleRows: records,
    createdAt: Date.now(),
  }
}

export function buildDataSummary(file: StoredFile): string {
  const preview = JSON.stringify(file.sampleRows.slice(0, 8), null, 0)
  return [
    `Dataset: ${file.name}`,
    `Rows: ${file.rows}, Columns: ${file.columns}`,
    `Columns: ${file.columnNames.join(', ')}`,
    `Sample rows (JSON): ${preview}`,
  ].join('\n')
}
