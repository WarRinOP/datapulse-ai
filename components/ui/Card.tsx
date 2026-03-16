'use client'

import React from 'react'

interface CardProps {
  children: React.ReactNode
  title?: string
  titleRight?: React.ReactNode
  className?: string
  surface2?: boolean
  noPad?: boolean
}

export function Card({
  children,
  title,
  titleRight,
  className = '',
  surface2 = false,
  noPad = false,
}: CardProps) {
  return (
    <div className={`${surface2 ? 'card-surface2' : 'card'} ${noPad ? '!p-0' : ''} ${className}`}>
      {(title || titleRight) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-widest">
              {title}
            </h2>
          )}
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
