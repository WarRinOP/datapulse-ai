import { createClient } from '@supabase/supabase-js'

// ── Lazy clients — only instantiated when called, not at import time ──────────
// This prevents build failures when env vars are absent during static generation

let _browserClient: ReturnType<typeof createClient> | null = null

// Browser / client-side client (uses anon key — safe for frontend)
export function getSupabaseClient() {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _browserClient
}

// Server-side client (uses service role key — only use in API routes/server components)
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// ── Types ─────────────────────────────────────────

export interface DpAnalysis {
  id: string
  filename: string
  file_type: 'csv' | 'xlsx' | 'xls'
  row_count: number
  column_count: number
  columns: string[]
  data_preview: Record<string, unknown>[]
  full_data: Record<string, unknown>[]
  narrative: string
  key_metrics: KeyMetric[]
  chart_configs: ChartConfig[]
  recommendations: string[]
  created_at: string
}

export interface KeyMetric {
  label: string
  value: string
  trend: 'up' | 'down' | 'stable'
  significance: string
}

export interface ChartDataset {
  label: string
  data: number[]
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  title: string
  labels: string[]
  datasets: ChartDataset[]
  reasoning: string
}

export interface DpQaMessage {
  id: string
  analysis_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
