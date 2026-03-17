'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HistoryStats } from '@/components/history/HistoryStats'
import { AnalysisTable } from '@/components/history/AnalysisTable'
import { FilterBar } from '@/components/history/FilterBar'
import { useToast } from '@/components/ui/Toast'
import { getSessionId } from '@/lib/session'
import type { DpAnalysis } from '@/lib/supabase'

function isWithinDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return d >= cutoff
}

export default function HistoryPage() {
  const { showToast } = useToast()
  const [allAnalyses, setAllAnalyses] = useState<DpAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all')

  // Fetch analyses scoped to this session
  useEffect(() => {
    const sid = getSessionId()
    fetch(`/api/analyses?session_id=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => setAllAnalyses(d.analyses ?? []))
      .catch(() => showToast('Failed to load analyses', 'error'))
      .finally(() => setIsLoading(false))
  }, [showToast])

  // Client-side filter: combining search + period
  const filteredAnalyses = useMemo(() => {
    let result = allAnalyses
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((a) => a.filename.toLowerCase().includes(q))
    }
    if (period === 'week') result = result.filter((a) => isWithinDays(a.created_at, 7))
    if (period === 'month') result = result.filter((a) => isWithinDays(a.created_at, 30))
    return result
  }, [allAnalyses, search, period])

  const emptyType = search.trim() || period !== 'all' ? 'no-results' : 'no-data'

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap',
        gap: '16px', marginBottom: '32px',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px', fontWeight: '700',
            color: '#f8fafc', margin: '0 0 6px',
          }}>Analysis History</h1>
          <p style={{ fontSize: '14px', color: '#4b5675', margin: 0 }}>
            Your past data analyses
          </p>
        </div>
        <Link href="/" className="btn btn-primary btn-md">
          New Analysis →
        </Link>
      </div>

      {/* Stats — always uses unfiltered allAnalyses */}
      <div style={{ marginBottom: '24px' }}>
        <HistoryStats analyses={allAnalyses} loading={isLoading} />
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '16px' }}>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          period={period}
          onPeriodChange={setPeriod}
          totalCount={allAnalyses.length}
          filteredCount={filteredAnalyses.length}
        />
      </div>

      {/* Table — no delete */}
      <AnalysisTable
        analyses={filteredAnalyses}
        isLoading={isLoading}
        emptyType={emptyType}
      />
    </div>
  )
}
