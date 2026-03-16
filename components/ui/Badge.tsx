'use client'

import React from 'react'

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  )
}
