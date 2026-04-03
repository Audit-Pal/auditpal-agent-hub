import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  tone?: 'default' | 'soft' | 'new' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'accent'
  className?: string
}

const toneClasses: Record<string, string> = {
  default: 'border-[#d8d0c3] bg-white text-[#171717]',
  soft: 'border-[#e6dfd3] bg-[#f6f2ea] text-[#5f5a51]',
  new: 'border-[#171717] bg-[#171717] text-white',
  critical: 'border-[#efc6bd] bg-[#fdf0ed] text-[#9f3d28]',
  high: 'border-[#f1d6b8] bg-[#fff5ea] text-[#9d5a17]',
  medium: 'border-[#f3e2a8] bg-[#fff9e7] text-[#8a6700]',
  low: 'border-[#cadbcf] bg-[#f1f7f2] text-[#315e50]',
  success: 'border-[#bdd5c6] bg-[#edf7f0] text-[#1f5a3f]',
  accent: 'border-[#c9d8d2] bg-[#eef5f2] text-[#315e50]',
}

export function Badge({ children, tone = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
