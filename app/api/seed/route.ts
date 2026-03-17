import { NextResponse } from 'next/server'
import { generateDemoCSV } from '@/lib/seed-demo'
import { parseCSV } from '@/lib/parser'
import { analyzeDataset } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    const DEMO_FILENAME = 'demo_sales_data.csv'

    // Delete any existing demo analysis
    await supabase
      .from('dp_analyses')
      .delete()
      .eq('filename', DEMO_FILENAME)

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

    // Save to Supabase
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
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ id: data.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
