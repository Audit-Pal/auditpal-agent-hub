import React from 'react'

interface ShellProps {
  children: React.ReactNode
  navigation: React.ReactNode
}

export function Shell({ children, navigation }: ShellProps) {
  return (
    <div className="min-h-screen bg-[#f3efe6] font-sans text-[#171717] antialiased selection:bg-[#d5e4dd] selection:text-[#171717]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(243,239,230,0)_65%)]" />
        <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-[#d9e8df] blur-[120px]" />
        <div className="absolute right-[10%] top-40 h-80 w-80 rounded-full bg-[#efe4d0] blur-[140px]" />
      </div>

      <div className="relative z-10 px-4 pb-16 pt-4 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1480px]">
          {navigation}

          <main className="mx-auto mt-8 w-full max-w-[1340px]">{children}</main>
        </div>
      </div>
    </div>
  )
}
