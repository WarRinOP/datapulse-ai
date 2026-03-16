'use client'

import React from 'react'

interface RecommendationsPanelProps {
  recommendations: string[]
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) return null

  return (
    <div className="card fade-in">
      <h2 style={{
        fontSize: '13px', fontWeight: '600', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        margin: '0 0 16px',
      }}>
        Recommended Actions
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {recommendations.map((rec, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            padding: '14px 0',
            borderTop: i > 0 ? '1px solid #1f2433' : 'none',
          }}>
            {/* Number pill */}
            <div style={{
              flexShrink: 0,
              width: '28px', height: '28px',
              background: 'rgba(129,140,248,0.1)',
              border: '1px solid rgba(129,140,248,0.25)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '11px', fontWeight: '700',
              color: '#818cf8',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
            {/* Text */}
            <p style={{
              margin: 0, fontSize: '14px',
              color: '#94a3b8', lineHeight: '1.6',
              paddingTop: '4px',
            }}>
              {rec}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
