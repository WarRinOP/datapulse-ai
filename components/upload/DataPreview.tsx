'use client'

import React from 'react'

interface DataPreviewProps {
  columns: string[]
  preview: Record<string, unknown>[]
  rowCount: number
  columnCount: number
  filename: string
  columnTypes?: Record<string, string>
  onAnalyze: () => void
  onReset: () => void
  analyzing?: boolean
}

const typeColor: Record<string, { bg: string; color: string; label: string }> = {
  numeric:     { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'num' },
  date:        { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', label: 'date' },
  categorical: { bg: 'rgba(75,86,117,0.25)',   color: '#94a3b8', label: 'text' },
  unknown:     { bg: 'rgba(75,86,117,0.15)',   color: '#4b5675', label: '?' },
}

function truncate(val: unknown, len = 20): string {
  const s = String(val ?? '')
  return s.length > len ? s.slice(0, len) + '…' : s
}

export function DataPreview({
  columns, preview, rowCount, columnCount, filename,
  columnTypes = {}, onAnalyze, onReset, analyzing = false,
}: DataPreviewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px', fontWeight: '600', color: '#f8fafc',
          }}>{filename}</span>
          <span style={{ color: '#2d3548' }}>·</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {rowCount.toLocaleString()} rows
          </span>
          <span style={{ color: '#2d3548' }}>·</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {columnCount} columns
          </span>
        </div>
        <span className="badge badge-success">Preview</span>
      </div>

      {/* Table */}
      <div style={{
        borderRadius: '10px', border: '1px solid #1f2433',
        overflow: 'auto', maxHeight: '280px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#171923', position: 'sticky', top: 0, zIndex: 1 }}>
              {columns.map((col) => {
                const t = columnTypes[col] ?? 'unknown'
                const tc = typeColor[t] ?? typeColor.unknown
                return (
                  <th key={col} style={{
                    padding: '10px 14px', textAlign: 'left',
                    borderBottom: '1px solid #1f2433',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>{col}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '1px 6px', borderRadius: '4px',
                        background: tc.bg, color: tc.color,
                        fontSize: '10px', fontWeight: '600',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        width: 'fit-content',
                      }}>{tc.label}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < preview.length - 1 ? '1px solid #1f2433' : 'none' }}>
                {columns.map((col) => (
                  <td key={col} style={{
                    padding: '9px 14px', color: '#94a3b8',
                    fontFamily: typeof row[col] === 'number' ? '"JetBrains Mono", monospace' : 'inherit',
                    whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden',
                  }} title={String(row[col] ?? '')}>
                    {truncate(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
      >
        {analyzing ? (
          <><span className="spinner spinner-sm" /> Analyzing...</>
        ) : (
          'Analyze with Claude →'
        )}
      </button>
      <button onClick={onReset} className="btn btn-ghost btn-sm" style={{ alignSelf: 'center' }}>
        Upload different file
      </button>
    </div>
  )
}
