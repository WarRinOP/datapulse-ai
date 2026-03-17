import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// ── GET /api/analyses ──────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? ''
    const period = searchParams.get('period') ?? 'all'
    const sessionId = searchParams.get('session_id') ?? ''

    const supabase = createServerSupabaseClient()
    let query = supabase
      .from('dp_analyses')
      .select('id, filename, file_type, row_count, column_count, columns, narrative, key_metrics, chart_configs, recommendations, session_id, created_at')
      .order('created_at', { ascending: false })

    // Session scoping — only show this user's analyses
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    // Filter by filename search
    if (search.trim()) {
      query = query.ilike('filename', `%${search.trim()}%`)
    }

    // Filter by time period
    if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      query = query.gte('created_at', monthAgo.toISOString())
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ analyses: data ?? [] }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}

// ── DELETE /api/analyses ───────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    // Block deletion in demo mode
    if (process.env.DEMO_MODE === 'true') {
      return NextResponse.json(
        { error: 'Deletion is disabled in demo mode' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verify it exists first
    const { data: existing, error: fetchError } = await supabase
      .from('dp_analyses')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Delete — dp_qa_messages cascade deletes automatically
    const { error: deleteError } = await supabase
      .from('dp_analyses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
