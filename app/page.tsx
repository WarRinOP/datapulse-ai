import Link from 'next/link'

export default function Home() {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '32px',
      }}
    >
      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
        <div className="badge badge-accent" style={{ alignSelf: 'center' }}>
          Powered by Claude AI
        </div>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: '800',
            letterSpacing: '-0.03em',
            lineHeight: '1.15',
            color: '#f8fafc',
            margin: 0,
          }}
        >
          Turn your data into{' '}
          <span style={{ color: '#818cf8' }}>instant insights</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.7', margin: 0 }}>
          Upload any CSV or Excel file. Claude AI reads your data, identifies trends,
          detects anomalies, and generates charts — all in seconds.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
            Upload & Analyze →
          </Link>
          <Link href="/history" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
            View History
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '900px',
          marginTop: '24px',
        }}
      >
        {[
          { icon: '📊', title: 'Auto Charts', desc: 'Claude selects and renders the most relevant chart types' },
          { icon: '🔍', title: 'AI Narrative', desc: 'Plain-English analysis of trends, anomalies, and outliers' },
          { icon: '💬', title: 'Q&A Panel', desc: 'Ask follow-up questions about your data in plain English' },
          { icon: '📄', title: 'Report Export', desc: 'Download executive summary as a formatted .txt report' },
        ].map((f) => (
          <div key={f.title} className="card" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>{f.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '6px' }}>{f.title}</div>
            <div style={{ fontSize: '13px', color: '#4b5675', lineHeight: '1.6' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Upload placeholder — will be replaced in Phase 3 */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '640px',
          border: '2px dashed #2d3548',
          textAlign: 'center',
          padding: '48px 32px',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📁</div>
        <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0 0 8px' }}>
          Drop your CSV or Excel file here
        </p>
        <p style={{ color: '#4b5675', fontSize: '13px', margin: 0 }}>
          or click to browse — max 10MB · .csv, .xlsx, .xls
        </p>
      </div>

      {/* Phase label */}
      <p style={{ color: '#4b5675', fontSize: '12px' }}>
        Phase 1 Foundation — Full upload & analysis UI coming in Phase 3
      </p>
    </div>
  )
}
