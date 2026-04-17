import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  tone?: 'default' | 'soft' | 'new' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'accent'
  className?: string
}

const toneClasses: Record<string, string> = {
  default: 'border-[var(--border)] bg-[rgba(10,20,29,0.82)] text-[var(--text)]',
  soft: 'border-[rgba(116,145,153,0.16)] bg-[rgba(16,31,43,0.72)] text-[var(--text-soft)]',
  new: 'border-[rgba(56,217,178,0.28)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(8,98,86,0.94))] text-[#021614]',
  critical: 'border-[rgba(255,157,157,0.14)] bg-[var(--critical-soft)] text-[var(--critical-text)]',
  high: 'border-[rgba(255,186,106,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
  medium: 'border-[rgba(255,211,125,0.18)] bg-[rgba(255,211,125,0.12)] text-[#ffd487]',
  low: 'border-[rgba(142,240,191,0.18)] bg-[rgba(72,214,156,0.12)] text-[var(--success-text)]',
  success: 'border-[rgba(142,240,191,0.18)] bg-[var(--success-soft)] text-[var(--success-text)]',
  accent: 'border-[rgba(56,217,178,0.18)] bg-[var(--accent-soft)] text-[var(--accent-strong)]',
}

export function Badge({ children, tone = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.25em] transition-all duration-300',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
