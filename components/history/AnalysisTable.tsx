'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { DpAnalysis } from '@/lib/supabase'

interface AnalysisTableProps {
  analyses: DpAnalysis[]
  isLoading: boolean
  onDelete: (id: string) => void
  emptyType?: 'no-data' | 'no-results'
}

const PAGE_SIZE = 10

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtNum(n: number): string {
  return n.toLocaleString()
}

function fileIcon(fileType: string): string {
  return fileType === 'csv' ? '📄' : '📊'
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: '13px', width: i === 0 ? '140px' : '60px', borderRadius: '4px' }} />
        </td>
      ))}
    </tr>
  )
}

interface DeleteDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

function DeleteDialog({ onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }} onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f1117', border: '1px solid #2d3548',
          borderRadius: '14px', padding: '28px 32px',
          maxWidth: '420px', width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ fontSize: '17px', fontWeight: '600', color: '#f8fafc', marginBottom: '10px' }}>
          Delete this analysis?
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.6 }}>
          This cannot be undone. The analysis and all associated Q&amp;A messages will be permanently removed.
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-md" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-md" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export function AnalysisTable({ analyses, isLoading, onDelete, emptyType = 'no-data' }: AnalysisTableProps) {
  const [page, setPage] = useState(0)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const totalPages = Math.ceil(analyses.length / PAGE_SIZE)
  const paginated = analyses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const start = page * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE + PAGE_SIZE, analyses.length)

  // Reset page when analyses change
  React.useEffect(() => {
    setPage(0)
  }, [analyses.length])

  if (!isLoading && analyses.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '64px 24px',
        background: '#0d1017', border: '1px solid #1f2433',
        borderRadius: '12px',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        {emptyType === 'no-data' ? (
          <>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
              No analyses yet
            </div>
            <div style={{ fontSize: '14px', color: '#4b5675', marginBottom: '24px' }}>
              Upload your first dataset to get AI-powered insights
            </div>
            <Link href="/" className="btn btn-primary btn-md">
              Upload Data →
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
              No analyses match your search
            </div>
            <div style={{ fontSize: '14px', color: '#4b5675' }}>
              Try a different search term or clear the filters
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {confirmId && (
        <DeleteDialog
          onConfirm={() => { onDelete(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #1f2433' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
          <thead>
            <tr style={{ background: '#171923', borderBottom: '1px solid #1f2433' }}>
              {['File', 'Rows', 'Cols', 'Preview', 'Date', 'Actions'].map((h) => (
                <th key={h} style={{
                  padding: '11px 16px', textAlign: 'left',
                  fontSize: '11px', fontWeight: '600',
                  color: '#4b5675', letterSpacing: '0.06em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : paginated.map((a, idx) => {
                  const isLast = idx === paginated.length - 1
                  const previewCols = (a.columns ?? []).slice(0, 3).join(' · ')
                  return (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: isLast ? 'none' : '1px solid #1f2433',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#171923')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* File */}
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        <span style={{ marginRight: '8px' }}>{fileIcon(a.file_type)}</span>
                        <span style={{
                          fontWeight: '500', color: '#f8fafc',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {a.filename}
                        </span>
                      </td>
                      {/* Rows */}
                      <td style={{
                        padding: '13px 16px',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: '#94a3b8', whiteSpace: 'nowrap',
                      }}>
                        {fmtNum(a.row_count)}
                      </td>
                      {/* Cols */}
                      <td style={{
                        padding: '13px 16px',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: '#94a3b8',
                      }}>
                        {a.column_count}
                      </td>
                      {/* Preview cols */}
                      <td style={{
                        padding: '13px 16px', color: '#4b5675',
                        maxWidth: '200px', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={(a.columns ?? []).join(', ')}>
                        {previewCols}
                      </td>
                      {/* Date */}
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }} title={fullDate(a.created_at)}>
                        <span style={{ color: '#94a3b8' }}>{relativeTime(a.created_at)}</span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Link
                            href={`/analysis/${a.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            View →
                          </Link>
                          <button
                            onClick={() => setConfirmId(a.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', padding: '5px 8px' }}
                            title="Delete analysis"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && analyses.length > PAGE_SIZE && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '12px', flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '12px', color: '#4b5675' }}>
            Showing {start}–{end} of {analyses.length} analyses
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Previous
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
