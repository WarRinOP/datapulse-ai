'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import type { ChartConfig } from '@/lib/supabase'

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend
)

// Dark theme palette
const COLORS = [
  '#818cf8', '#22c55e', '#f59e0b',
  '#ef4444', '#3b82f6', '#ec4899', '#14b8a6',
]

const ALPHA = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function buildChartData(config: ChartConfig) {
  const isPie = config.type === 'pie' || config.type === 'doughnut'
  return {
    labels: config.labels || [],
    datasets: (config.datasets || []).map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: isPie
        ? COLORS.map((c) => ALPHA(c, 0.85))
        : ALPHA(COLORS[i % COLORS.length], 0.8),
      borderColor: isPie
        ? COLORS.map((c) => c)
        : COLORS[i % COLORS.length],
      borderWidth: isPie ? 2 : 1.5,
      borderRadius: config.type === 'bar' ? 4 : 0,
      tension: config.type === 'line' ? 0.4 : 0,
      pointRadius: config.type === 'line' ? 4 : 0,
      pointHoverRadius: config.type === 'line' ? 6 : 0,
    })),
  }
}

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#94a3b8',
        font: { size: 12 },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#0f1117',
      borderColor: '#1f2433',
      borderWidth: 1,
      titleColor: '#f8fafc',
      bodyColor: '#94a3b8',
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.06)' },
      border: { color: '#1f2433' },
    },
    y: {
      ticks: { color: '#94a3b8', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.06)' },
      border: { color: '#1f2433' },
    },
  },
}

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: BASE_OPTIONS.plugins,
}

function SingleChart({ config }: { config: ChartConfig }) {
  const data = buildChartData(config)
  const isPie = config.type === 'pie' || config.type === 'doughnut'
  const opts = isPie ? PIE_OPTIONS : BASE_OPTIONS

  let chart: React.ReactNode
  switch (config.type) {
    case 'bar':      chart = <Bar data={data} options={opts} />; break
    case 'line':     chart = <Line data={data} options={opts} />; break
    case 'pie':      chart = <Pie data={data} options={opts} />; break
    case 'doughnut': chart = <Doughnut data={data} options={opts} />; break
    default:         chart = <Bar data={data} options={opts} />
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{
        fontSize: '13px', fontWeight: '600', color: '#f8fafc',
        margin: 0, lineHeight: 1.4,
      }}>{config.title}</h3>
      <div style={{ position: 'relative', maxHeight: '280px' }}>
        {chart}
      </div>
    </div>
  )
}

interface ChartGridProps {
  chartConfigs: ChartConfig[]
}

export function ChartGrid({ chartConfigs }: ChartGridProps) {
  const valid = (chartConfigs || []).filter(
    (c) => c && c.labels?.length > 0 && c.datasets?.length > 0
  )

  if (valid.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#4b5675' }}>
        No charts generated for this dataset.
      </div>
    )
  }

  return (
    <div className="fade-in" style={{
      display: 'grid',
      gridTemplateColumns: valid.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '16px',
    }}>
      {valid.map((config, i) => (
        <SingleChart key={i} config={config} />
      ))}
    </div>
  )
}
