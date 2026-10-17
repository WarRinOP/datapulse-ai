import { NextRequest, NextResponse } from 'next/server'
import { generateDemoCSV } from '@/lib/seed-demo'
import { parseCSV } from '@/lib/parser'
import { analyzeDataset } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'
import { reserveQuota, GuardConfig } from '@/lib/usage-guard'

export const dynamic = 'force-dynamic'

const MAX_ANALYSES = 5
const GUARD: GuardConfig = { prefix: 'dp', limit: MAX_ANALYSES, noun: 'analyses' }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId = (body as { session_id?: string }).session_id || ''

    const supabase = createServerSupabaseClient()
    const DEMO_FILENAME = 'demo_sales_data.csv'

    // ── Usage limit: atomic, per device and per network address ──
    const reservation = await reserveQuota(req, supabase, GUARD)
    if (!reservation.ok) return reservation.response

    // Delete any existing demo analysis for this session
    if (sessionId) {
      await supabase
        .from('dp_analyses')
        .delete()
        .eq('filename', DEMO_FILENAME)
        .eq('session_id', sessionId)
    }

    // Generate CSV and parse
    const csvText = generateDemoCSV()
    const parsed = parseCSV(csvText)

    if (parsed.rowCount === 0) {
      return NextResponse.json({ error: 'Demo generation failed' }, { status: 500 })
    }

    // Call Claude
    let analysis
    try {
      analysis = await analyzeDataset({
        filename: DEMO_FILENAME,
        rowCount: parsed.rowCount,
        columns: parsed.columns,
        columnTypes: parsed.columnTypes,
        summaryStats: parsed.summaryStats,
        dataSample: parsed.dataSampleForClaude,
      })
    } catch (claudeError) {
      await reservation.refund()
      throw claudeError
    }

    // Save to Supabase — tagged with session
    const { data, error } = await supabase
      .from('dp_analyses')
      .insert({
        filename: DEMO_FILENAME,
        file_type: 'csv',
        row_count: parsed.rowCount,
        column_count: parsed.columnCount,
        columns: parsed.columns,
        data_preview: parsed.dataPreview,
        full_data: [],
        narrative: analysis.narrative,
        key_metrics: analysis.key_metrics,
        chart_configs: analysis.chart_configs,
        recommendations: analysis.recommendations,
        session_id: sessionId || null,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    return reservation.respond(NextResponse.json({ id: data.id, remaining: reservation.remaining }))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
