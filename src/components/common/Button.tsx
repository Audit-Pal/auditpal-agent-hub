import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-[#0fca8a] text-[#06080b] hover:opacity-[0.88] hover:-translate-y-px border-none',
  secondary:
    'border border-[var(--border)] bg-[linear-gradient(145deg,rgba(20,38,51,0.94),rgba(10,19,27,0.92))] text-[var(--text)] hover:-translate-y-0.5 hover:border-[rgba(151,203,200,0.28)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]',
  outline:
    'border border-[var(--border)] bg-[rgba(9,18,27,0.72)] text-[var(--text)] hover:-translate-y-0.5 hover:border-[rgba(56,217,178,0.38)] hover:bg-[rgba(13,26,37,0.92)] hover:text-[var(--accent-strong)]',
  destructive:
    'bg-[#ff5f57] text-[#06080b] hover:opacity-[0.88] hover:-translate-y-px border-none',
}

const sizeClasses: Record<string, string> = {
  sm: 'min-h-[38px] px-3.5 text-sm',
  md: 'min-h-[46px] px-5 text-sm',
  lg: 'min-h-[54px] px-6 text-[15px]',
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[6px] font-semibold tracking-[0.01em] transition-all duration-200',
        'disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
