import { NextRequest, NextResponse } from 'next/server'
import { askQuestion } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'

const MAX_QA_PER_SESSION = 20

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { analysisId, question, messageHistory = [], session_id = '' } = body

    // ── Validate ──────────────────────────────────
    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // ── Rate limit Q&A by session ─────────────────
    if (session_id) {
      const { count } = await supabase
        .from('dp_qa_messages')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_id', analysisId)
        .eq('role', 'user')

      if (count !== null && count >= MAX_QA_PER_SESSION) {
        return NextResponse.json(
          { error: 'Q&A limit reached for this analysis', code: 'RATE_LIMIT' },
          { status: 429 }
        )
      }
    }

    // ── Fetch analysis context ─────────────────────
    const { data: analysis, error: fetchError } = await supabase
      .from('dp_analyses')
      .select('id, columns, narrative, key_metrics')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // ── Build summary stats from key_metrics ───────
    const summaryStats: Record<string, unknown> = {}
    if (Array.isArray(analysis.key_metrics)) {
      analysis.key_metrics.forEach((m: { label: string; value: string }) => {
        summaryStats[m.label] = m.value
      })
    }

    // ── Last 10 messages for context ───────────────
    const recentHistory = Array.isArray(messageHistory)
      ? (messageHistory as Array<{ role: 'user' | 'assistant'; content: string }>).slice(-10)
      : []

    // ── Ask Claude ─────────────────────────────────
    let answer: string
    try {
      answer = await askQuestion({
        question: question.trim(),
        analysisId,
        columns: analysis.columns,
        narrative: analysis.narrative,
        summaryStats,
        conversationHistory: recentHistory,
      })
    } catch (claudeError) {
      return NextResponse.json(
        { error: `Claude error: ${claudeError instanceof Error ? claudeError.message : 'Unknown'}` },
        { status: 500 }
      )
    }

    // ── Save both messages ─────────────────────────
    await supabase.from('dp_qa_messages').insert([
      { analysis_id: analysisId, role: 'user', content: question.trim() },
      { analysis_id: analysisId, role: 'assistant', content: answer },
    ])

    return NextResponse.json({ answer }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
