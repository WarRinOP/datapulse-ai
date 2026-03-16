import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// ── GET /api/analyses/[id] ─────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = createServerSupabaseClient()

    // Fetch analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('dp_analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Fetch QA messages sorted by created_at asc
    const { data: messages, error: messagesError } = await supabase
      .from('dp_qa_messages')
      .select('*')
      .eq('analysis_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    return NextResponse.json(
      { analysis, messages: messages ?? [] },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
