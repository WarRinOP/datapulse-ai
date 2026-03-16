'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/upload/FileUpload'
import { DataPreview } from '@/components/upload/DataPreview'
import { useToast } from '@/components/ui/Toast'
import type { DpAnalysis } from '@/lib/supabase'

type UploadState = 'idle' | 'selected' | 'analyzing' | 'done'

interface ParsedFile {
  file: File
  columns: string[]
  preview: Record<string, unknown>[]
  rowCount: number
  columnCount: number
  columnTypes: Record<string, string>
}

const STEPS = [
  'File parsed',
  'Generating insights…',
  'Building charts',
  'Writing recommendations',
]

function AnalyzingOverlay() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    STEPS.forEach((_, i) => {
      if (i === 0) return
      timers.push(setTimeout(() => setStep(i), i * 4000))
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '32px', padding: '60px 24px', textAlign: 'center',
    }}>
      {/* Spinner */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        border: '3px solid #1f2433',
        borderTop: '3px solid #818cf8',
        animation: 'spin 0.9s linear infinite',
      }} />

      <div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
          Analyzing your data with Claude…
        </div>
        <div style={{ fontSize: '13px', color: '#4b5675' }}>
          This takes 10–20 seconds
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13px',
              color: done ? '#22c55e' : active ? '#f8fafc' : '#2d3548',
              transition: 'color 0.3s',
            }}>
              <span style={{ width: '16px', textAlign: 'center', fontWeight: '600' }}>
                {done ? '✓' : active ? '⟳' : '○'}
              </span>
              <span>{s}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HomePage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<DpAnalysis[]>([])

  // Load recent analyses
  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => r.json())
      .then((d) => setRecentAnalyses((d.analyses ?? []).slice(0, 3)))
      .catch(() => {})
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    // Parse client-side to show preview
    setUploadState('selected')
    try {
      // Dynamic import to avoid SSR issues
      const { parseCSV, parseExcel } = await import('@/lib/parser')
      const ext = file.name.split('.').pop()?.toLowerCase()
      let parsed
      if (ext === 'csv') {
        const text = await file.text()
        parsed = parseCSV(text)
      } else {
        const buf = await file.arrayBuffer()
        parsed = parseExcel(buf)
      }
      setParsedFile({
        file,
        columns: parsed.columns,
        preview: parsed.dataPreview,
        rowCount: parsed.rowCount,
        columnCount: parsed.columnCount,
        columnTypes: parsed.columnTypes,
      })
    } catch {
      showToast('Failed to preview file', 'error')
      setUploadState('idle')
    }
  }, [showToast])

  const handleAnalyze = async () => {
    if (!parsedFile) return
    setUploadState('analyzing')

    try {
      const formData = new FormData()
      formData.append('file', parsedFile.file)

      const res = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setUploadState('done')
      router.push(`/analysis/${data.analysis.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Analysis failed', 'error')
      setUploadState('selected')
    }
  }

  const handleReset = () => {
    setParsedFile(null)
    setUploadState('idle')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero header */}
      <div style={{
        textAlign: 'center',
        padding: '64px 24px 40px',
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: '800', lineHeight: 1.15,
          color: '#f8fafc', margin: '0 0 14px',
          letterSpacing: '-0.02em',
        }}>
          DataPulse
        </h1>
        <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.7, margin: '0 0 8px' }}>
          Upload your data. Get instant AI-powered analysis,<br />
          charts, and actionable insights.
        </p>
        <p style={{ fontSize: '12px', color: '#4b5675', marginBottom: '24px' }}>
          CSV or Excel · Up to 10MB
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
          {[['📊', 'Auto Charts'], ['🤖', 'AI Narrative'], ['💬', 'Ask Questions']].map(([icon, label]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '20px',
              background: '#171923', border: '1px solid #1f2433',
              fontSize: '12px', color: '#94a3b8',
            }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 20px' }}>

        {/* State: analyzing */}
        {uploadState === 'analyzing' && <AnalyzingOverlay />}

        {/* State: idle */}
        {uploadState === 'idle' && (
          <FileUpload onFileSelect={handleFileSelect} />
        )}

        {/* State: selected — show file upload + preview */}
        {uploadState === 'selected' && parsedFile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FileUpload onFileSelect={handleFileSelect} />
            <DataPreview
              columns={parsedFile.columns}
              preview={parsedFile.preview}
              rowCount={parsedFile.rowCount}
              columnCount={parsedFile.columnCount}
              filename={parsedFile.file.name}
              columnTypes={parsedFile.columnTypes}
              onAnalyze={handleAnalyze}
              onReset={handleReset}
            />
          </div>
        )}
      </div>

      {/* Recent analyses */}
      {recentAnalyses.length > 0 && uploadState === 'idle' && (
        <div style={{
          maxWidth: '720px', margin: '56px auto 0',
          width: '100%', padding: '0 20px 60px',
        }}>
          <h2 style={{
            fontSize: '13px', fontWeight: '600', color: '#4b5675',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: '14px',
          }}>Recent Analyses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentAnalyses.map((a) => (
              <Link key={a.id} href={`/analysis/${a.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                background: '#0d1017', border: '1px solid #1f2433',
                borderRadius: '10px', textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2d3548')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2433')}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>{a.filename}</div>
                  <div style={{ fontSize: '12px', color: '#4b5675', marginTop: '2px' }}>
                    {a.row_count.toLocaleString()} rows · {fmtDate(a.created_at)}
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: '#818cf8' }}>View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
