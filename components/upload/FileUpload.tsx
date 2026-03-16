'use client'

import React, { useCallback, useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
}

const MAX_SIZE = 10 * 1024 * 1024
const ACCEPTED = ['.csv', '.xlsx', '.xls']

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED.includes(ext)) return `Unsupported format. Upload a .csv, .xlsx, or .xls file.`
    if (file.size > MAX_SIZE) return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`
    if (file.size === 0) return `File is empty.`
    return null
  }

  const handleFile = useCallback((file: File) => {
    const err = validate(file)
    if (err) { setError(err); setSelected(null); return }
    setError(null)
    setSelected(file)
    onFileSelect(file)
  }, [onFileSelect])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const remove = () => { setSelected(null); setError(null) }

  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  if (selected) {
    return (
      <div style={{
        border: '1px solid #22c55e44',
        borderRadius: '12px',
        background: 'rgba(34,197,94,0.04)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'rgba(34,197,94,0.12)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>📄</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{selected.name}</div>
            <div style={{ fontSize: '12px', color: '#4b5675', marginTop: '2px' }}>{fmtSize(selected.size)}</div>
          </div>
        </div>
        <button onClick={remove} className="btn btn-ghost btn-sm" style={{ color: '#4b5675', flexShrink: 0 }}>
          ✕ Remove
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${error ? '#ef4444' : dragOver ? '#818cf8' : '#2d3548'}`,
          borderRadius: '12px',
          background: dragOver ? 'rgba(129,140,248,0.04)' : error ? 'rgba(239,68,68,0.03)' : 'transparent',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '14px', opacity: dragOver ? 1 : 0.7 }}>
          {dragOver ? '📂' : '📁'}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '500', color: dragOver ? '#818cf8' : '#f8fafc', marginBottom: '6px' }}>
          {dragOver ? 'Drop file here' : 'Drop CSV or Excel file here'}
        </div>
        <div style={{ fontSize: '13px', color: '#4b5675', marginBottom: '16px' }}>
          or click to browse
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '20px',
          background: '#171923', border: '1px solid #1f2433',
          fontSize: '11px', color: '#4b5675', letterSpacing: '0.04em',
        }}>
          .csv · .xlsx · .xls · max 10MB
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontSize: '13px', color: '#ef4444',
        }}>
          <span>⚠</span> {error}
        </div>
      )}

      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={onInputChange} />
    </div>
  )
}
