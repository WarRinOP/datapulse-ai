import { NextRequest, NextResponse } from 'next/server'
import { askQuestion } from '@/lib/claude'
import { createServerSupabaseClient } from '@/lib/supabase'
import { reserveQuota, GuardConfig } from '@/lib/usage-guard'

const MAX_QUESTION_CHARS = 500
// Q&A calls Claude too, so it has its own budget per device and address.
const GUARD: GuardConfig = { prefix: 'dp', limit: 20, noun: 'questions', scope: 'qa' }

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

    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: 'Question is too long' }, { status: 400 })
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
      ? (messageHistory as Array<{ role: 'user' | 'assistant'; content: string }>)
          .filter(
            (m) =>
              m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
          )
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_QUESTION_CHARS * 4) }))
      : []

    // ── Usage limit: atomic, per device and per network address ──
    const reservation = await reserveQuota(req, supabase, GUARD)
    if (!reservation.ok) return reservation.response

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
      await reservation.refund()
      return reservation.respond(
        NextResponse.json(
          { error: `Claude error: ${claudeError instanceof Error ? claudeError.message : 'Unknown'}` },
          { status: 500 }
        )
      )
    }

    // ── Save both messages ─────────────────────────
    await supabase.from('dp_qa_messages').insert([
      { analysis_id: analysisId, role: 'user', content: question.trim() },
      { analysis_id: analysisId, role: 'assistant', content: answer },
    ])

    return reservation.respond(NextResponse.json({ answer }, { status: 200 }))
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
