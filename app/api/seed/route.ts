import { NextRequest, NextResponse } from 'next/server'
import { generateDemoCSV } from '@/lib/seed-demo'
import { parseCSV } from '@/lib/parser'
import { analyzeDataset } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MAX_ANALYSES = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId = (body as { session_id?: string }).session_id || ''

    const supabase = createServerSupabaseClient()
    const DEMO_FILENAME = 'demo_sales_data.csv'

    // ── Rate limit check ────────────────────────────
    if (sessionId) {
      const { data: session } = await supabase
        .from('dp_sessions')
        .select('usage_count')
        .eq('session_id', sessionId)
        .single()

      if (session && session.usage_count >= MAX_ANALYSES) {
        return NextResponse.json(
          { error: 'Analysis limit reached for this session', code: 'RATE_LIMIT', remaining: 0 },
          { status: 429 }
        )
      }
    }

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
    const analysis = await analyzeDataset({
      filename: DEMO_FILENAME,
      rowCount: parsed.rowCount,
      columns: parsed.columns,
      columnTypes: parsed.columnTypes,
      summaryStats: parsed.summaryStats,
      dataSample: parsed.dataSampleForClaude,
    })

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

    // ── Update session usage ──────────────────────
    let remaining = MAX_ANALYSES - 1
    if (sessionId) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

      // Upsert session
      const { data: existing } = await supabase
        .from('dp_sessions')
        .select('usage_count')
        .eq('session_id', sessionId)
        .single()

      if (existing) {
        const newCount = existing.usage_count + 1
        await supabase
          .from('dp_sessions')
          .update({ usage_count: newCount, ip_address: ip })
          .eq('session_id', sessionId)
        remaining = Math.max(0, MAX_ANALYSES - newCount)
      } else {
        await supabase
          .from('dp_sessions')
          .insert({ session_id: sessionId, ip_address: ip, usage_count: 1 })
        remaining = MAX_ANALYSES - 1
      }
    }

    return NextResponse.json({ id: data.id, remaining })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
