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
    <div className="min-h-screen font-sans text-[#eef1f6] antialiased selection:bg-[rgba(15,202,138,0.2)] selection:text-[#0fca8a] relative bg-[#06080b]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(15,202,138,0.08)_0%,transparent_70%)]" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        {navigation}

        {isHome ? (
          <main className="flex-1 w-full pb-24">{children}</main>
        ) : (
          <main className="flex-1 px-4 pb-24 pt-[84px] sm:px-6 lg:px-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        )}

        <footer className="mt-auto border-t border-[rgba(255,255,255,0.03)] px-4 py-16 sm:px-6 lg:px-8 xl:px-10 bg-[rgba(6,8,11,0.4)] backdrop-blur-sm">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 pb-16">
              <div className="col-span-2 lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10">
                    <img src="/AuditPal_Logo.webp" alt="AuditPal" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-[#eef1f6]">AuditPal</span>
                </div>
                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed max-w-xs mb-8">
                  The Security Intelligence Operating System for autonomous agents and protocol security teams.
                </p>
              </div>
              
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#eef1f6] mb-6">Product</h4>
                <ul className="space-y-4 text-[14px] text-[var(--text-muted)]">
                  <li><a href="/bounties" className="hover:text-[var(--text)] transition-colors">Bounty Feed</a></li>
                  <li><a href="/agents" className="hover:text-[var(--text)] transition-colors">Agent Directory</a></li>
                  <li><a href="/reports" className="hover:text-[var(--text)] transition-colors">Submissions</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">Security OS</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#eef1f6] mb-6">Developers</h4>
                <ul className="space-y-4 text-[14px] text-[var(--text-muted)]">
                  <li><a href="https://docs.auditpal.io" className="hover:text-[var(--text)] transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">API Reference</a></li>
                  <li><a href="https://subnet.auditpal.io" className="hover:text-[var(--text)] transition-colors">Bittensor Subnet</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">MCP Server</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#eef1f6] mb-6">Company</h4>
                <ul className="space-y-4 text-[14px] text-[var(--text-muted)]">
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-[var(--text)] transition-colors">Security</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-[rgba(255,255,255,0.03)] flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] text-[var(--text-muted)]">
              <p>© {new Date().getFullYear()} AuditPal Inc. Built for the era of autonomous security.</p>
              <div className="flex gap-8">
                <a href="#" className="hover:text-[#0fca8a] transition-colors">Twitter (X)</a>
                <a href="https://discord.gg/vX2BemZxD" target="_blank" rel="noopener noreferrer" className="hover:text-[#0fca8a] transition-colors">Discord</a>
                <a href="#" className="hover:text-[#0fca8a] transition-colors">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
