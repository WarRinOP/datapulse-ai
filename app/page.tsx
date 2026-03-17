'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/upload/FileUpload'
import { DataPreview } from '@/components/upload/DataPreview'
import { useToast } from '@/components/ui/Toast'
import { getSessionId, getStoredRemaining, setStoredRemaining, MAX_ANALYSES, getAdminKey, setAdminKey, clearAdminKey, isAdminMode } from '@/lib/session'
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
      gap: '32px', padding: '60px 16px', textAlign: 'center', width: '100%',
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        border: '3px solid #1f2433',
        borderTop: '3px solid #818cf8',
        animation: 'spin 0.9s linear infinite',
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
          Analyzing your data with Claude…
        </div>
        <div style={{ fontSize: '13px', color: '#4b5675' }}>This takes 10–20 seconds</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px',
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

function SkeletonAnalysisCard() {
  return (
    <div style={{
      padding: '14px 18px', background: '#0d1017',
      border: '1px solid #1f2433', borderRadius: '10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div className="skeleton" style={{ height: '14px', width: '140px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '11px', width: '90px', borderRadius: '4px' }} />
      </div>
      <div className="skeleton" style={{ height: '13px', width: '45px', borderRadius: '4px' }} />
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
  const [recentAnalyses, setRecentAnalyses] = useState<DpAnalysis[] | null>(null) // null = loading
  const [seeding, setSeeding] = useState(false)
  const [remaining, setRemaining] = useState(MAX_ANALYSES)
  const [sessionId, setSessionId] = useState('')
  const [admin, setAdmin] = useState(false)
  const [showAdminInput, setShowAdminInput] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [exhaustedTest, setExhaustedTest] = useState(false)

  // Initialize session
  useEffect(() => {
    const sid = getSessionId()
    setSessionId(sid)
    setRemaining(isAdminMode() ? 999 : getStoredRemaining())
    setAdmin(isAdminMode())

    // Fetch recent — scoped to this session
    fetch(`/api/analyses?session_id=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => setRecentAnalyses((d.analyses ?? []).slice(0, 3)))
      .catch(() => setRecentAnalyses([])) // silent fail → empty
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadState('selected')
    try {
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
        file, columns: parsed.columns, preview: parsed.dataPreview,
        rowCount: parsed.rowCount, columnCount: parsed.columnCount,
        columnTypes: parsed.columnTypes,
      })
    } catch {
      showToast('Failed to preview file', 'error')
      setUploadState('idle')
    }
  }, [showToast])

  const handleAnalyze = async () => {
    if (!parsedFile) return
    if (!admin && remaining <= 0) {
      showToast('Analysis limit reached. Contact Abrar Tajwar Khan for unlimited access.', 'error')
      return
    }
    setUploadState('analyzing')
    try {
      const formData = new FormData()
      formData.append('file', parsedFile.file)
      formData.append('session_id', sessionId)
      const headers: Record<string, string> = {}
      // Check Block mode: omit admin key so real rate limit code applies
      if (admin && !exhaustedTest) headers['x-admin-key'] = getAdminKey()
      const res = await fetch('/api/analyze', { method: 'POST', body: formData, headers })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'RATE_LIMIT') {
          setRemaining(0)
          setStoredRemaining(0)
          showToast('Analysis limit reached for this session', 'error')
          setUploadState('idle')
          return
        }
        throw new Error(data.error || 'Analysis failed')
      }
      const newRemaining = data.remaining ?? remaining - 1
      setRemaining(newRemaining)
      setStoredRemaining(newRemaining)
      setUploadState('done')
      router.push(`/analysis/${data.analysis.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Analysis failed', 'error')
      setUploadState('selected')
    }
  }

  const handleReset = () => { setParsedFile(null); setUploadState('idle') }

  const handleLoadDemo = async () => {
    if (!admin && remaining <= 0) {
      showToast('Analysis limit reached. Contact Abrar Tajwar Khan for unlimited access.', 'error')
      return
    }
    setSeeding(true)
    setUploadState('analyzing')
    try {
      const hdrs: Record<string, string> = { 'Content-Type': 'application/json' }
      // Check Block mode: omit admin key so real rate limit code applies
      if (admin && !exhaustedTest) hdrs['x-admin-key'] = getAdminKey()
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'RATE_LIMIT') {
          setRemaining(0)
          setStoredRemaining(0)
          showToast('Analysis limit reached for this session', 'error')
          setUploadState('idle')
          return
        }
        throw new Error(data.error || 'Seed failed')
      }
      const newRemaining = data.remaining ?? remaining - 1
      setRemaining(newRemaining)
      setStoredRemaining(newRemaining)
      router.push(`/analysis/${data.id}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Demo load failed', 'error')
      setUploadState('idle')
    } finally {
      setSeeding(false)
    }
  }

  const limitReached = !admin && remaining <= 0

  async function exhaustSession(action: 'exhaust' | 'reset' = 'exhaust') {
    const sid = sessionId
    const res = await fetch('/api/admin/exhaust-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify({ session_id: sid, action }),
    })
    if (res.ok) {
      if (action === 'exhaust') {
        setExhaustedTest(true)
        setRemaining(0)
        setStoredRemaining(0)
        showToast('Session exhausted — try analyzing to test the real block', 'info')
      } else {
        setExhaustedTest(false)
        setRemaining(999)
        showToast('Session reset — back to unlimited mode', 'success')
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,64px) 20px 32px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 8vw, 44px)', fontWeight: '800',
          lineHeight: 1.15, color: '#f8fafc', margin: '0 0 14px',
          letterSpacing: '-0.02em',
        }}>DataPulse</h1>
        <p style={{ fontSize: 'clamp(14px,3vw,16px)', color: '#94a3b8', lineHeight: 1.7, margin: '0 0 8px' }}>
          Upload your data. Get instant AI-powered analysis,<br />
          charts, and actionable insights.
        </p>
        <p style={{ fontSize: '12px', color: '#4b5675', marginBottom: '20px' }}>CSV or Excel · Up to 10MB</p>

        {/* Feature pills + Remaining badge */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
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
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 14px', borderRadius: '20px',
            background: limitReached ? 'rgba(239,68,68,0.08)' : '#171923',
            border: `1px solid ${limitReached ? 'rgba(239,68,68,0.3)' : admin ? 'rgba(34,197,94,0.3)' : '#1f2433'}`,
            fontSize: '12px',
            fontFamily: '"JetBrains Mono", monospace',
            color: limitReached ? '#ef4444' : admin ? '#22c55e' : '#4b5675',
          }}>
            {exhaustedTest ? '🔒 Check Block ON' : admin ? '∞ Unlimited' : limitReached ? '❌ Limit reached' : `${remaining}/${MAX_ANALYSES} remaining`}
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 16px' }}>
        {uploadState === 'analyzing' && <AnalyzingOverlay />}

        {uploadState === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!limitReached && <FileUpload onFileSelect={handleFileSelect} />}
            {limitReached && (
              <div style={{
                textAlign: 'center', padding: '40px 24px',
                background: '#0d1017', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
                  Demo limit reached
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7 }}>
                  You&apos;ve used all {MAX_ANALYSES} analyses in this demo session.<br />
                  Want unlimited access? <span style={{ color: '#818cf8', fontWeight: '500' }}>Contact Abrar Tajwar Khan</span> for a custom build.
                </div>
              </div>
            )}
            {/* Demo button */}
            {!limitReached && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleLoadDemo}
                  disabled={seeding}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#818cf8', borderColor: 'rgba(129,140,248,0.25)' }}
                >
                  {seeding ? <><span className="spinner spinner-sm" /> Loading…</> : '✨ Try with sample data →'}
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* Recent analyses — with skeleton */}
      {uploadState === 'idle' && (
        <div style={{ maxWidth: '720px', margin: '48px auto 0', width: '100%', padding: '0 16px 60px' }}>
          {/* Loading skeleton */}
          {recentAnalyses === null && (
            <>
              <div className="skeleton" style={{ height: '11px', width: '120px', borderRadius: '4px', marginBottom: '14px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3].map((i) => <SkeletonAnalysisCard key={i} />)}
              </div>
            </>
          )}

          {/* Real data */}
          {recentAnalyses !== null && recentAnalyses.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#4b5675', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Recent Analyses
                </h2>
                <Link href="/history" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
                  View all →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentAnalyses.map((a) => (
                  <Link key={a.id} href={`/analysis/${a.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: '#0d1017', border: '1px solid #1f2433',
                    borderRadius: '10px', textDecoration: 'none', transition: 'border-color 0.15s',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2d3548')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1f2433')}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.filename}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5675', marginTop: '2px' }}>
                        {a.row_count.toLocaleString()} rows · {fmtDate(a.created_at)}
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', color: '#818cf8', flexShrink: 0 }}>View →</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: 'auto', padding: '20px 16px', textAlign: 'center',
        borderTop: '1px solid #1f2433', fontSize: '12px', color: '#4b5675',
      }}>
        <div>Built by <span style={{ color: '#94a3b8', fontWeight: '500' }}>Abrar Tajwar Khan</span></div>
        <div style={{ marginTop: '8px' }}>
          {admin ? (
            <>
              <button
                onClick={() => { clearAdminKey(); setAdmin(false); setExhaustedTest(false); setRemaining(getStoredRemaining()); showToast('Admin mode disabled', 'success') }}
                style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: '10px', cursor: 'pointer', padding: '2px 6px' }}
              >
                ✓ Admin active — disable
              </button>
              <span style={{ color: '#2d3548', fontSize: '10px', margin: '0 6px' }}>|</span>
              <button
                onClick={() => exhaustedTest ? exhaustSession('reset') : undefined}
                style={{ background: 'none', border: 'none', fontSize: '10px', cursor: exhaustedTest ? 'pointer' : 'default', fontWeight: exhaustedTest ? 400 : 700, color: exhaustedTest ? '#4b5675' : '#22c55e', textDecoration: exhaustedTest ? 'none' : 'underline', padding: '2px 4px' }}
              >
                🔓 Unlimited Testing
              </button>
              <span style={{ color: '#2d3548', fontSize: '10px', margin: '0 4px' }}>/</span>
              <button
                onClick={() => !exhaustedTest ? exhaustSession('exhaust') : undefined}
                style={{ background: 'none', border: 'none', fontSize: '10px', cursor: !exhaustedTest ? 'pointer' : 'default', fontWeight: !exhaustedTest ? 400 : 700, color: !exhaustedTest ? '#4b5675' : '#f59e0b', textDecoration: !exhaustedTest ? 'none' : 'underline', padding: '2px 4px' }}
              >
                🔒 Check Block
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAdminInput(true)}
              style={{ background: 'none', border: 'none', color: '#2d3548', fontSize: '10px', cursor: 'pointer', padding: '2px 6px' }}
            >
              Admin
            </button>
          )}
        </div>
      </footer>

      {/* Admin modal */}
      {showAdminInput && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
          onClick={() => { setShowAdminInput(false); setAdminError(''); setAdminCode('') }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f1117', border: '1px solid #1f2433',
              borderRadius: '14px', padding: '24px', maxWidth: '380px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>
              Are you the developer?
            </div>
            <div style={{ fontSize: '12px', color: '#4b5675', marginBottom: '16px' }}>
              Enter the secret code you set for unlimited testing.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                type="password"
                value={adminCode}
                onChange={(e) => { setAdminCode(e.target.value); setAdminError('') }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Submit
                    (async () => {
                      setAdminLoading(true)
                      try {
                        const res = await fetch('/api/admin-verify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code: adminCode }),
                        })
                        const data = await res.json()
                        if (data.valid) {
                          setAdminKey(adminCode)
                          setAdmin(true)
                          setRemaining(999)
                          setShowAdminInput(false)
                          setAdminCode('')
                          showToast('Admin mode enabled — unlimited access', 'success')
                        } else {
                          setAdminError('Invalid code')
                        }
                      } catch {
                        setAdminError('Verification failed')
                      } finally {
                        setAdminLoading(false)
                      }
                    })()
                  }
                }}
                placeholder="Secret code"
                autoFocus
                style={{ flex: 1, fontSize: '13px' }}
              />
              <button
                className="btn btn-primary btn-md"
                disabled={!adminCode.trim() || adminLoading}
                onClick={async () => {
                  setAdminLoading(true)
                  try {
                    const res = await fetch('/api/admin-verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: adminCode }),
                    })
                    const data = await res.json()
                    if (data.valid) {
                      setAdminKey(adminCode)
                      setAdmin(true)
                      setRemaining(999)
                      setShowAdminInput(false)
                      setAdminCode('')
                      showToast('Admin mode enabled — unlimited access', 'success')
                    } else {
                      setAdminError('Invalid code')
                    }
                  } catch {
                    setAdminError('Verification failed')
                  } finally {
                    setAdminLoading(false)
                  }
                }}
              >
                {adminLoading ? <span className="spinner spinner-sm" /> : 'Verify'}
              </button>
            </div>
            {adminError && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>{adminError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
