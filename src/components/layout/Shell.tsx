import React from 'react'

interface ShellProps {
  children: React.ReactNode
  navigation: React.ReactNode
}

export function Shell({ children, navigation }: ShellProps) {
  return (
    <div className="min-h-screen font-sans text-[var(--text)] antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--accent-strong)]">
      <div className="relative z-10 flex min-h-screen flex-col">
        {navigation}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>

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
