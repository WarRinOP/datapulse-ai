'use client'

import React, { useState } from 'react'
import type { KeyMetric } from '@/lib/supabase'

interface MetricsRowProps {
  keyMetrics: KeyMetric[]
  loading?: boolean
}

const trendConfig = {
  up:     { symbol: '↑', color: '#22c55e', label: 'Trending up' },
  down:   { symbol: '↓', color: '#ef4444', label: 'Trending down' },
  stable: { symbol: '→', color: '#f59e0b', label: 'Stable' },
}

function MetricCard({ metric }: { metric: KeyMetric }) {
  const trend = trendConfig[metric.trend] ?? trendConfig.stable
  const [expanded, setExpanded] = useState(false)

  // Check if text is long enough to be truncated (rough: >80 chars = likely 2+ lines)
  const isLong = metric.significance && metric.significance.length > 80

  return (
    <div
      className="card"
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: isLong ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
      }}
      onClick={() => isLong && setExpanded((e) => !e)}
      title={isLong && !expanded ? 'Click to read more' : undefined}
    >
      <div className="label-caps">{metric.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '22px', fontWeight: '700',
          color: '#f8fafc', lineHeight: 1.2,
          wordBreak: 'break-all',
        }}>
          {metric.value}
        </div>
        <span style={{
          fontSize: '16px', fontWeight: '700',
          color: trend.color, flexShrink: 0,
        }} title={trend.label}>{trend.symbol}</span>
      </div>
      {metric.significance && (
        <div style={{
          fontSize: '11px', color: '#4b5675',
          fontStyle: 'italic', lineHeight: 1.5,
          ...(expanded ? {} : {
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }),
          transition: 'all 0.2s ease',
        }}>
          {metric.significance}
        </div>
      )}
      {isLong && (
        <span style={{
          fontSize: '10px',
          color: '#818cf8',
          fontWeight: 500,
          marginTop: '2px',
        }}>
          {expanded ? '↑ Show less' : '↓ Read more'}
        </span>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="skeleton" style={{ height: '11px', width: '60%', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '24px', width: '80%', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '11px', width: '90%', borderRadius: '4px' }} />
    </div>
  )
}

export function MetricsRow({ keyMetrics, loading = false }: MetricsRowProps) {
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
      }}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!keyMetrics || keyMetrics.length === 0) return null

  return (
    <div className="fade-in" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '12px',
    }}>
      {keyMetrics.map((m, i) => <MetricCard key={i} metric={m} />)}
    </div>
  )
}
