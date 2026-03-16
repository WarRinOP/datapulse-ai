'use client'

import React, { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

interface ReportButtonProps {
  analysisId: string
  filename: string
}

export function ReportButton({ analysisId, filename }: ReportButtonProps) {
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const download = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/report?id=${analysisId}`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="(.+?)"/)
      const fname = match?.[1] ?? `datapulse-${filename}.txt`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Report downloaded successfully', 'success')
    } catch {
      showToast('Download failed — please try again', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="btn btn-secondary btn-md"
      style={{ gap: '8px' }}
    >
      {loading ? (
        <><span className="spinner spinner-sm" /> Generating...</>
      ) : (
        <>
          <span>↓</span>
          Download Report
        </>
      )}
    </button>
  )
}
