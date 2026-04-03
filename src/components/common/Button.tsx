import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  primary: 'border border-[#171717] bg-[#171717] text-white hover:bg-[#2a2a2a]',
  secondary: 'border border-[#d8d0c3] bg-[#f6f2ea] text-[#171717] hover:bg-white',
  ghost: 'border border-transparent bg-transparent text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]',
  outline: 'border border-[#d8d0c3] bg-white text-[#171717] hover:border-[#171717]',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-medium tracking-[0.02em] transition-all duration-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
