import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateReport, getReportFilename } from '@/lib/report'
import type { DpAnalysis } from '@/lib/supabase'

// ── GET /api/report?id= ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('dp_analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const analysis = data as DpAnalysis
    const reportText = generateReport(analysis)
    const filename = getReportFilename(analysis)

    return new NextResponse(reportText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
