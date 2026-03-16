'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavBar() {
  const pathname = usePathname()

  return (
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
        padding: '0 24px',
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
  )
}
