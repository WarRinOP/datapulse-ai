import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MetricsRow } from '@/components/analysis/MetricsRow'
import { NarrativePanel } from '@/components/analysis/NarrativePanel'
import { ChartGrid } from '@/components/analysis/ChartGrid'
import { RecommendationsPanel } from '@/components/analysis/RecommendationsPanel'
import { QAPanel } from '@/components/analysis/QAPanel'
import { ReportButton } from '@/components/analysis/ReportButton'
import type { DpAnalysis, DpQaMessage } from '@/lib/supabase'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
}

async function getAnalysis(id: string): Promise<{ analysis: DpAnalysis; messages: DpQaMessage[] } | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `http://localhost:${process.env.PORT ?? 3001}`
      : 'http://localhost:3001'
    const res = await fetch(`${base}/api/analyses/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
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
  if (!result) notFound()

  const { analysis, messages } = result

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '32px',
      }}>
        <Link href="/" style={{
          color: '#4b5675', fontSize: '14px', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          ← Back to Home
        </Link>

        <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '15px', fontWeight: '600', color: '#f8fafc',
          }}>{analysis.filename}</div>
          <div style={{ fontSize: '12px', color: '#4b5675', marginTop: '2px' }}>
            {fmt(analysis.created_at)} · {analysis.row_count.toLocaleString()} rows · {analysis.column_count} columns
          </div>
        </div>

        <ReportButton analysisId={analysis.id} filename={analysis.filename} />
      </div>

      {/* Metrics */}
      <div style={{ marginBottom: '28px' }}>
        <MetricsRow keyMetrics={analysis.key_metrics} />
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,55%) minmax(0,45%)',
        gap: '20px',
        marginBottom: '24px',
        alignItems: 'start',
      }} className="analysis-grid">
        {/* Left: Narrative + Recommendations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NarrativePanel narrative={analysis.narrative} />
          <RecommendationsPanel recommendations={analysis.recommendations} />
        </div>

        {/* Right: Charts */}
        <div>
          <ChartGrid chartConfigs={analysis.chart_configs} />
        </div>
      </div>

      {/* QA Panel — full width */}
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
