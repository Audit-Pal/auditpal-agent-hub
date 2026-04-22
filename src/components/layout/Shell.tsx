import React from 'react'
import { useLocation } from 'react-router-dom'

interface ShellProps {
  children: React.ReactNode
  navigation: React.ReactNode
}

export function Shell({ children, navigation }: ShellProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen font-sans text-[#eef1f6] antialiased selection:bg-[rgba(15,202,138,0.2)] selection:text-[#0fca8a] relative bg-[#06080b]">
      {!isHome && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,rgba(15,202,138,0.12),transparent)]" />
        </div>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        {navigation}

        {isHome ? (
          <main className="flex-1 w-full pb-24">{children}</main>
        ) : (
          <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        )}

        <footer className="mt-auto border-t border-[rgba(255,255,255,0.03)] px-4 py-12 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 text-[13px] text-[var(--text-muted)] md:flex-row">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-[rgba(0,212,168,0.1)] p-1 border border-[rgba(0,212,168,0.2)]">
                <img src="/audipal.png" alt="AuditPal" className="h-full w-full object-contain invert mix-blend-screen opacity-60" />
              </div>
              <p>© {new Date().getFullYear()} AuditPal. Security Intelligence Operating System.</p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="transition-colors hover:text-[var(--text)]">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-[var(--text)]">Terms of Service</a>
              <a href="#" className="transition-colors hover:text-[var(--text)]">Documentation</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
