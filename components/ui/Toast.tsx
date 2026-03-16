'use client'

import React, { useState, createContext, useContext, useCallback } from 'react'

// ─── Types ────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  exiting?: boolean
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

// ─── Provider ─────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      )
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '360px',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Toast Item ───────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  const colorMap: Record<ToastType, string> = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#818cf8',
  }

  return (
    <div
      className={toast.exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        background: '#0f1117',
        border: `1px solid ${colorMap[toast.type]}33`,
        borderLeft: `3px solid ${colorMap[toast.type]}`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: '260px',
      }}
    >
      <span
        style={{
          color: colorMap[toast.type],
          fontWeight: 700,
          fontSize: '14px',
          flexShrink: 0,
        }}
      >
        {iconMap[toast.type]}
      </span>
      <span style={{ color: '#f8fafc', fontSize: '13px', lineHeight: '1.4' }}>
        {toast.message}
      </span>
    </div>
  )
}
