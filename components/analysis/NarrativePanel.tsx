'use client'

import React, { useState } from 'react'

interface NarrativePanelProps {
  narrative: string
}

const WORD_LIMIT = 300

function countWords(text: string) {
  return text.trim().split(/\s+/).length
}

function truncateWords(text: string, limit: number) {
  const words = text.trim().split(/\s+/)
  if (words.length <= limit) return text
  return words.slice(0, limit).join(' ') + '…'
}

export function NarrativePanel({ narrative }: NarrativePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const wordCount = countWords(narrative)
  const isLong = wordCount > WORD_LIMIT
  const displayed = isLong && !expanded ? truncateWords(narrative, WORD_LIMIT) : narrative

  return (
    <div className="card" style={{ paddingLeft: '20px', borderLeft: '3px solid #818cf8' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          AI Analysis
        </h2>
        <span style={{
          fontSize: '10px', color: '#4b5675',
          background: '#171923', border: '1px solid #1f2433',
          padding: '2px 8px', borderRadius: '4px',
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: '0.03em',
        }}>
          claude-haiku-4-5
        </span>
      </div>

      {/* Narrative */}
      <div style={{
        fontSize: '14px', lineHeight: '1.8',
        color: '#94a3b8', whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {displayed}
      </div>

      {/* Expand / collapse */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#818cf8', fontSize: '13px', fontWeight: '500',
            padding: '0', textDecoration: 'underline',
          }}
        >
          {expanded ? 'Show less ↑' : `Read more (${wordCount - WORD_LIMIT} more words) ↓`}
        </button>
      )}
    </div>
  )
}
