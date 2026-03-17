import { NextRequest, NextResponse } from 'next/server'
import { parseCSV, parseExcel } from '@/lib/parser'
import { analyzeDataset } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ANALYSES = 5

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

    // ── Rate limiting ─────────────────────────────
    // ── Rate limiting ─────────────────────────────
    const supabaseRL = createServerSupabaseClient()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // 1) Session-based check
    if (sessionId) {
      const { data: session } = await supabaseRL
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

    // 2) IP-based check — blocks switching browsers on the same network
    if (ip !== 'unknown') {
      const { data: ipSessions } = await supabaseRL
        .from('dp_sessions')
        .select('usage_count')
        .eq('ip_address', ip)

      const totalIpUsage = (ipSessions || []).reduce((sum, s) => sum + (s.usage_count || 0), 0)
      if (totalIpUsage >= MAX_ANALYSES) {
        return NextResponse.json(
          { error: 'Rate limit exceeded for this network', code: 'RATE_LIMIT', remaining: 0 },
          { status: 429 }
        )
      }
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
      if (msg.includes('parse') || msg.includes('JSON')) {
        return NextResponse.json(
          { error: 'Failed to parse Claude response. Try again.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Claude error: ${msg}` },
        { status: 500 }
      )
    }

    // ── Save to Supabase ───────────────────────────
    const supabase = createServerSupabaseClient()
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

    // ── Update session usage ──────────────────────
    let remaining = MAX_ANALYSES - 1
    if (sessionId) {

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

      return NextResponse.json({ analysis: data, remaining }, { status: 200 })
    }

    return NextResponse.json({ analysis: data, remaining: MAX_ANALYSES }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
