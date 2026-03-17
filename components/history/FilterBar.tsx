'use client'

import React, { useEffect, useRef } from 'react'

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  period: 'all' | 'month' | 'week'
  onPeriodChange: (v: 'all' | 'month' | 'week') => void
  totalCount: number
  filteredCount: number
}

const PERIODS: { label: string; value: 'all' | 'month' | 'week' }[] = [
  { label: 'All Time',   value: 'all' },
  { label: 'This Month', value: 'month' },
  { label: 'This Week',  value: 'week' },
]

export function FilterBar({
  search, onSearchChange,
  period, onPeriodChange,
  totalCount, filteredCount,
}: FilterBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInput = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearchChange(val), 300)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      flexWrap: 'wrap', gap: '12px',
    }}>
      {/* Search */}
      <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '14px', color: '#4b5675', pointerEvents: 'none',
        }}>🔍</span>
        <input
          ref={inputRef}
          className="input"
          defaultValue={search}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search by filename..."
          style={{ paddingLeft: '36px', width: '100%' }}
        />
      </div>

      {/* Period pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            style={{
              padding: '6px 14px', borderRadius: '20px',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              transition: 'all 0.15s',
              background: period === p.value ? '#818cf8' : '#171923',
              color: period === p.value ? '#0f1117' : '#94a3b8',
              border: period === p.value ? '1px solid #818cf8' : '1px solid #1f2433',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <div style={{ fontSize: '12px', color: '#4b5675', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
        Showing {filteredCount} of {totalCount} {totalCount === 1 ? 'analysis' : 'analyses'}
      </div>
    </div>
  )
}
