import { NextRequest, NextResponse } from 'next/server'
import { parseCSV, parseExcel } from '@/lib/parser'
import { analyzeDataset } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'
import { reserveQuota, GuardConfig } from '@/lib/usage-guard'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ANALYSES = 5
const GUARD: GuardConfig = { prefix: 'dp', limit: MAX_ANALYSES, noun: 'analyses' }

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const sessionId = (formData.get('session_id') as string) || ''

    // ── Validate ──────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB uploaded)` },
        { status: 400 }
      )
    }

    const filename = file.name
    const ext = filename.split('.').pop()?.toLowerCase()

    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a .csv, .xlsx, or .xls file.' },
        { status: 400 }
      )
    }

    // ── Parse ──────────────────────────────────────
    let parsed
    try {
      if (ext === 'csv') {
        const text = await file.text()
        parsed = parseCSV(text)
      } else {
        const buffer = await file.arrayBuffer()
        parsed = parseExcel(buffer)
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: `Failed to parse file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (parsed.rowCount === 0) {
      return NextResponse.json({ error: 'File is empty — no data rows found.' }, { status: 400 })
    }

    // ── Usage limit: atomic, per device and per network address ──
    const supabase = createServerSupabaseClient()
    const reservation = await reserveQuota(req, supabase, GUARD)
    if (!reservation.ok) return reservation.response

    // ── Claude analysis ────────────────────────────
    let analysis
    try {
      analysis = await analyzeDataset({
        filename,
        rowCount: parsed.rowCount,
        columns: parsed.columns,
        columnTypes: parsed.columnTypes,
        summaryStats: parsed.summaryStats,
        dataSample: parsed.dataSampleForClaude,
      })
    } catch (claudeError) {
      const msg = claudeError instanceof Error ? claudeError.message : 'Unknown error'
      await reservation.refund()
      if (msg.includes('parse') || msg.includes('JSON')) {
        return reservation.respond(
          NextResponse.json({ error: 'Failed to parse Claude response. Try again.' }, { status: 500 })
        )
      }
      return reservation.respond(
        NextResponse.json({ error: `Claude error: ${msg}` }, { status: 500 })
      )
    }

    // ── Save to Supabase ───────────────────────────
    const { data, error: dbError } = await supabase
      .from('dp_analyses')
      .insert({
        filename,
        file_type: ext as 'csv' | 'xlsx' | 'xls',
        row_count: parsed.rowCount,
        column_count: parsed.columnCount,
        columns: parsed.columns,
        data_preview: parsed.dataPreview,
        full_data: parsed.rows,
        narrative: analysis.narrative,
        key_metrics: analysis.key_metrics,
        chart_configs: analysis.chart_configs,
        recommendations: analysis.recommendations,
        session_id: sessionId || null,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      )
    }

    return reservation.respond(
      NextResponse.json({ analysis: data, remaining: reservation.remaining }, { status: 200 })
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
