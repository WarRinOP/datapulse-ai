import React from 'react'
import Link from 'next/link'
import { MetricsRow } from '@/components/analysis/MetricsRow'
import { NarrativePanel } from '@/components/analysis/NarrativePanel'
import { ChartGrid } from '@/components/analysis/ChartGrid'
import { RecommendationsPanel } from '@/components/analysis/RecommendationsPanel'
import { QAPanel } from '@/components/analysis/QAPanel'
import { ReportButton } from '@/components/analysis/ReportButton'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { DpAnalysis, DpQaMessage } from '@/lib/supabase'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

async function getAnalysis(id: string): Promise<{ analysis: DpAnalysis; messages: DpQaMessage[] } | null> {
  try {
    const supabase = createServerSupabaseClient()

    // Fetch analysis directly from Supabase
    const { data: analysis, error: analysisError } = await supabase
      .from('dp_analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (analysisError || !analysis) return null

    // Fetch QA messages
    const { data: messages } = await supabase
      .from('dp_qa_messages')
      .select('*')
      .eq('analysis_id', id)
      .order('created_at', { ascending: true })

    return { analysis, messages: messages ?? [] }
  } catch {
    return null
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params
  const result = await getAnalysis(id)

  if (!result) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '40px 24px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: '0 0 10px' }}>
          Analysis not found
        </h1>
        <p style={{ fontSize: '14px', color: '#4b5675', marginBottom: '24px' }}>
          This analysis may have been deleted or the link is invalid.
        </p>
        <Link href="/history" className="btn btn-secondary btn-md">
          ← Back to History
        </Link>
      </div>
    )
  }

  const { analysis, messages } = result

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header — stacks vertically on mobile */}
      <div className="analysis-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', marginBottom: '28px',
      }}>
        <Link href="/" style={{
          color: '#4b5675', fontSize: '14px', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '6px',
          flexShrink: 0,
        }}>
          ← Back to Home
        </Link>

        <div style={{ textAlign: 'center', flex: '1', minWidth: '180px' }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 'clamp(12px,2.5vw,15px)', fontWeight: '600', color: '#f8fafc',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{analysis.filename}</div>
          <div style={{ fontSize: '12px', color: '#4b5675', marginTop: '2px' }}>
            {fmt(analysis.created_at)} · {analysis.row_count.toLocaleString()} rows · {analysis.column_count} columns
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <ReportButton analysisId={analysis.id} filename={analysis.filename} />
        </div>
      </div>

      {/* Metrics — auto-fit grid (mobile: 2 cols min, desktop: up to 6) */}
      <div style={{ marginBottom: '24px' }}>
        <MetricsRow keyMetrics={analysis.key_metrics} />
      </div>

      {/* Two-column layout → single on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,55%) minmax(0,45%)',
        gap: '20px',
        marginBottom: '24px',
        alignItems: 'start',
      }} className="analysis-grid">
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NarrativePanel narrative={analysis.narrative} />
          <RecommendationsPanel recommendations={analysis.recommendations} />
        </div>
        {/* Right */}
        <div>
          <ChartGrid chartConfigs={analysis.chart_configs} />
        </div>
      </div>

      {/* QA Panel — full width, stays above mobile keyboard */}
      <QAPanel
        analysisId={analysis.id}
        initialMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
      />
    </div>
  )
}

export async function generateMetadata({ params }: AnalysisPageProps) {
  const { id } = await params
  const result = await getAnalysis(id)
  if (!result) return { title: 'Analysis Not Found — DataPulse' }
  return {
    title: `${result.analysis.filename} — DataPulse`,
    description: result.analysis.narrative?.slice(0, 160),
  }
}
