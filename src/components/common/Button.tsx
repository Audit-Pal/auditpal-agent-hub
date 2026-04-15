import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  primary:
    'border border-[rgba(56,217,178,0.26)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(8,98,86,0.94))] text-[#021614] shadow-[0_18px_38px_rgba(30,186,152,0.24)] hover:-translate-y-0.5 hover:shadow-[0_24px_46px_rgba(30,186,152,0.32)]',
  secondary:
    'border border-[var(--border)] bg-[linear-gradient(145deg,rgba(20,38,51,0.94),rgba(10,19,27,0.92))] text-[var(--text)] hover:-translate-y-0.5 hover:border-[rgba(151,203,200,0.28)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]',
  outline:
    'border border-[var(--border)] bg-[rgba(9,18,27,0.72)] text-[var(--text)] hover:-translate-y-0.5 hover:border-[rgba(56,217,178,0.38)] hover:bg-[rgba(13,26,37,0.92)] hover:text-[var(--accent-strong)]',
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
        'inline-flex items-center justify-center gap-2 rounded-[18px] font-semibold tracking-[0.01em] transition-all duration-200',
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
