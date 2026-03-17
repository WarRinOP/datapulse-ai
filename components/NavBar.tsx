'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HowItWorksModal } from '@/components/HowItWorksModal'

export function NavBar() {
  const pathname = usePathname()
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #1f2433',
          background: 'rgba(8,9,13,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700',
                color: '#0f1117',
                flexShrink: 0,
              }}
            >
              D
            </div>
            <span
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#f8fafc',
                letterSpacing: '-0.02em',
              }}
            >
              DataPulse
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#818cf8',
                background: 'rgba(129,140,248,0.1)',
                border: '1px solid rgba(129,140,248,0.2)',
                borderRadius: '4px',
                padding: '1px 6px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              AI
            </span>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* How It Works — icon only on mobile, text on desktop */}
            <button
              onClick={() => setShowModal(true)}
              className="nav-link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                fontSize: '13px',
              }}
              title="How It Works"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="sm-only">How It Works</span>
            </button>

            <Link
              href="/"
              className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            >
              Analyze
            </Link>
            <Link
              href="/history"
              className={`nav-link ${pathname === '/history' ? 'active' : ''}`}
            >
              History
            </Link>
          </nav>
        </div>
      </header>

      {showModal && <HowItWorksModal onClose={() => setShowModal(false)} />}
    </>
  )
}
