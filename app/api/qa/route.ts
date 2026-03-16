import { NextRequest, NextResponse } from 'next/server'
import { askQuestion } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { analysisId, question, messageHistory = [] } = body

    // ── Validate ──────────────────────────────────
    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

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
    const { error: insertError } = await supabase.from('dp_qa_messages').insert([
      { analysis_id: analysisId, role: 'user',      content: question.trim() },
      { analysis_id: analysisId, role: 'assistant', content: answer },
    ])

    if (insertError) {
      // Non-fatal — still return the answer
      console.error('Failed to save QA messages:', insertError.message)
    }

    return NextResponse.json({ answer }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
