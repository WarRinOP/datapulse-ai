import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedData {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  columnCount: number
  columnTypes: Record<string, string>
  summaryStats: Record<string, unknown>
  dataPreview: Record<string, unknown>[]
  dataSampleForClaude: string
}

// ─── CSV Parsing ──────────────────────────────────
export function parseCSV(text: string): ParsedData {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  })

  const rows = result.data
  return buildParsedData(rows)
}

// ─── Excel Parsing ────────────────────────────────
export function parseExcel(buffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,
  })

  // Convert numeric strings back to numbers
  const processed = rows.map((row) => {
    const newRow: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) {
        newRow[k] = Number(v)
      } else {
        newRow[k] = v
      }
    }
    return newRow
  })

  return buildParsedData(processed)
}

// ─── Core builder ─────────────────────────────────
function buildParsedData(rows: Record<string, unknown>[]): ParsedData {
  if (rows.length === 0) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      columnTypes: {},
      summaryStats: {},
      dataPreview: [],
      dataSampleForClaude: 'Empty dataset.',
    }
  }

  const columns = Object.keys(rows[0])
  const columnTypes = inferColumnTypes(rows, columns)
  const summaryStats = computeSummaryStats(rows, columns, columnTypes)
  const dataPreview = rows.slice(0, 5)
  const dataSampleForClaude = buildClaudeSample(rows, columns)

  return {
    columns,
    rows,
    rowCount: rows.length,
    columnCount: columns.length,
    columnTypes,
    summaryStats,
    dataPreview,
    dataSampleForClaude,
  }
}

// ─── Type inference ───────────────────────────────
function inferColumnTypes(
  rows: Record<string, unknown>[],
  columns: string[]
): Record<string, string> {
  const types: Record<string, string> = {}
  const sample = rows.slice(0, 100)

  for (const col of columns) {
    const values = sample.map((r) => r[col]).filter((v) => v !== null && v !== undefined && v !== '')
    if (values.length === 0) { types[col] = 'unknown'; continue }

    const numericCount = values.filter((v) => typeof v === 'number').length
    const ratio = numericCount / values.length

    if (ratio > 0.8) {
      types[col] = 'numeric'
    } else if (looksLikeDates(values as string[])) {
      types[col] = 'date'
    } else {
      types[col] = 'categorical'
    }
  }
  return types
}

function looksLikeDates(values: string[]): boolean {
  const datePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i
  const matchCount = values.filter((v) => datePattern.test(String(v))).length
  return matchCount / values.length > 0.5
}

// ─── Summary statistics ───────────────────────────
function computeSummaryStats(
  rows: Record<string, unknown>[],
  columns: string[],
  columnTypes: Record<string, string>
): Record<string, unknown> {
  const stats: Record<string, unknown> = {}

  for (const col of columns) {
    if (columnTypes[col] === 'numeric') {
      const nums = rows
        .map((r) => r[col])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))

      if (nums.length === 0) continue

      const sum = nums.reduce((a, b) => a + b, 0)
      const mean = sum / nums.length
      const sorted = [...nums].sort((a, b) => a - b)

      stats[col] = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: Math.round(mean * 100) / 100,
        sum: Math.round(sum * 100) / 100,
        count: nums.length,
      }
    } else if (columnTypes[col] === 'categorical') {
      const valueCounts: Record<string, number> = {}
      rows.forEach((r) => {
        const v = String(r[col] ?? '')
        valueCounts[v] = (valueCounts[v] ?? 0) + 1
      })
      const topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

      stats[col] = {
        type: 'categorical',
        uniqueValues: Object.keys(valueCounts).length,
        topValues: Object.fromEntries(topValues),
      }
    }
  }

  return stats
}

// ─── Claude sample builder ────────────────────────
function buildClaudeSample(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  const MAX_DIRECT = 500
  const SAMPLE_SIZE = 50

  if (rows.length <= MAX_DIRECT) {
    return JSON.stringify(rows, null, 0)
  }

  // Large dataset: send first + last N rows with note
  const sample = [
    ...rows.slice(0, SAMPLE_SIZE),
    ...rows.slice(-SAMPLE_SIZE),
  ]

  return `[Note: Full dataset has ${rows.length} rows. Showing first ${SAMPLE_SIZE} and last ${SAMPLE_SIZE} rows for analysis.]

Columns: ${columns.join(', ')}

Sample data:
${JSON.stringify(sample, null, 0)}`
}
