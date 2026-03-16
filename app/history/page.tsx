import Link from 'next/link'

export default function HistoryPage() {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc', margin: '0 0 8px' }}>
          Analysis History
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          All your previous data analyses — coming in Phase 4
        </p>
      </div>

      {/* Empty state */}
      <div
        className="card"
        style={{ textAlign: 'center', padding: '64px 32px' }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', margin: '0 0 8px' }}>
          No analyses yet
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 24px' }}>
          Upload your first CSV or Excel file to get started
        </p>
        <Link href="/" className="btn btn-primary btn-md" style={{ textDecoration: 'none' }}>
          Analyze Data →
        </Link>
      </div>
    </div>
  )
}
