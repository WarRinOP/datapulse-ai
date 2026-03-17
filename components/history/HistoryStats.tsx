'use client'

import React from 'react'
import type { DpAnalysis } from '@/lib/supabase'

interface HistoryStatsProps {
  analyses: DpAnalysis[]
  loading?: boolean
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= weekAgo
}

function StatCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {loading ? (
        <>
          <div className="skeleton" style={{ height: '11px', width: '55%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '28px', width: '70%', borderRadius: '4px' }} />
        </>
      ) : (
        <>
          <div className="label-caps">{label}</div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '26px', fontWeight: '600',
            color: '#818cf8', lineHeight: 1,
          }}>{value}</div>
        </>
      )}
    </div>
  )
}

export function HistoryStats({ analyses, loading = false }: HistoryStatsProps) {
  const total = analyses.length
  const thisWeek = analyses.filter((a) => isThisWeek(a.created_at)).length
  const totalRows = analyses.reduce((sum, a) => sum + (a.row_count ?? 0), 0)
  const csvCount = analyses.filter((a) => a.file_type === 'csv').length
  const excelCount = analyses.filter((a) => a.file_type !== 'csv').length
  const mostCommon = csvCount >= excelCount ? 'CSV' : 'Excel'

  const stats = [
    { label: 'Total Analyses',       value: loading ? '—' : String(total) },
    { label: 'Files This Week',      value: loading ? '—' : String(thisWeek) },
    { label: 'Total Rows Processed', value: loading ? '—' : totalRows.toLocaleString() },
    { label: 'Most Common Type',     value: loading ? '—' : (total === 0 ? '—' : mostCommon) },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} loading={loading} />
      ))}
    </div>
  )
}
