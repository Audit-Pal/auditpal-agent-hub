import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

const navItems: { label: string; path: string; active: (pathname: string) => boolean }[] = [
  { label: 'Home',             path: '/',                  active: (p) => p === '/' },
  { label: 'Bounties',         path: '/bounties',          active: (p) => p.startsWith('/bounties') || p.startsWith('/bounty/') || p.startsWith('/programs') || p.startsWith('/program/') },
  { label: 'Applications',     path: '/reports',           active: (p) => p === '/reports' },
  { label: 'Agents',           path: '/agents/leaderboard',active: (p) => p.startsWith('/agent') },
  { label: 'API',              path: '/docs',              active: (p) => p.startsWith('/docs') },
  { label: 'Org Workspace',    path: '/org/dashboard',     active: (p) => p.startsWith('/org/') },
]

interface TopNavProps {
  pathname: string
  reportCount: number
  onLogin: () => void
}

function formatRole(role: string) {
  return role.toLowerCase().split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function formatDate(value?: string) {
  if (!value) return 'Not yet'
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  } catch { return value }
}

function getRoleMessage(role?: string) {
  switch (role) {
    case 'ORGANIZATION': return 'Launch programs, fund them, and manage applications.'
    case 'ADMIN':        return 'Oversee researcher, validator, and platform operations.'
    case 'GATEKEEPER':   return 'Review findings and escalate signal to the validator queue.'
    case 'VALIDATOR':    return 'Finalize criticality, pay valid findings, keep trust high.'
    default:             return 'Browse live bounty programs, submit findings, track triage.'
  }
}

export function TopNav({ pathname, reportCount, onLogin }: TopNavProps) {
  const { user, logout, generateApiKey } = useAuth()
  const location = useLocation()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'api-key' | 'agents'>('profile')
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [agentSuccess, setAgentSuccess] = useState<string | null>(null)
  const [myAgents, setMyAgents] = useState<any[]>([])
  const [agentForm, setAgentForm] = useState({ name: '', headline: '', summary: '', capabilities: '' })
  const profileRef = useRef<HTMLDivElement | null>(null)

  const canGenerateApiKey = user?.role === 'BOUNTY_HUNTER' || user?.role === 'ADMIN'

  const visibleNavItems = navItems.filter((item) => {
    if (item.label === 'Bounties'      && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Agents'        && user?.role === 'ORGANIZATION') return false
    if (item.label === 'API'           && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Org Workspace') return user?.role === 'ORGANIZATION'
    return true
  })

  // Close mobile menu on route change
  useEffect(() => { setIsMobileMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (activeProfileTab !== 'agents' || !user || user.role === 'ORGANIZATION') return
    api.get<any[]>('/agents/mine').then((res) => { if (res.success) setMyAgents(res.data) })
  }, [activeProfileTab, user])

  useEffect(() => {
    if (!isProfileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isProfileOpen])

  useEffect(() => {
    setGeneratedApiKey(null)
    setCopyState('idle')
    setIsProfileOpen(false)
  }, [user?.id])

  const handleGenerateApiKey = async () => {
    if (!canGenerateApiKey) return
    setIsGeneratingKey(true)
    const key = await generateApiKey()
    setIsGeneratingKey(false)
    if (!key) { window.alert('Unable to generate an API key right now.'); return }
    setGeneratedApiKey(key)
    setCopyState('idle')
  }

  const handleCopyApiKey = async () => {
    if (!generatedApiKey) return
    try { await navigator.clipboard.writeText(generatedApiKey); setCopyState('copied') }
    catch { setCopyState('failed') }
  }

  const handleRegisterAgent = async (e: FormEvent) => {
    e.preventDefault()
    setAgentError(null)
    setAgentSuccess(null)
    if (!agentForm.name || !agentForm.headline || !agentForm.summary) { setAgentError('Please fill in all required fields.'); return }
    const capabilities = agentForm.capabilities.split(',').map((s) => s.trim()).filter(Boolean)
    if (capabilities.length === 0) { setAgentError('Please add at least one capability.'); return }
    setIsRegisteringAgent(true)
    try {
      const res = await api.post('/agents', { ...agentForm, capabilities })
      if (res.success) {
        const refreshed = await api.get<any[]>('/agents/mine')
        if (refreshed.success) setMyAgents(refreshed.data)
        setAgentForm({ name: '', headline: '', summary: '', capabilities: '' })
        setAgentSuccess('Agent registered successfully.')
      } else { setAgentError(res.error || 'Failed to register agent.') }
    } catch { setAgentError('An unexpected error occurred.') }
    finally { setIsRegisteringAgent(false) }
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="surface-card-strong signal-card rounded-2xl px-4 py-3 md:px-5"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-[rgba(0,212,168,0.22)] bg-[rgba(0,212,168,0.08)] shadow-[0_0_20px_rgba(0,212,168,0.15)] transition-all duration-300 group-hover:shadow-[0_0_28px_rgba(0,212,168,0.28)]">
                <img src="/audipal_transparent.png" alt="AuditPal" className="h-7 w-7 object-contain" />
              </div>
              <span className="hidden sm:block text-[15px] font-bold tracking-[-0.02em] text-[var(--text)] transition-colors group-hover:text-[var(--accent-strong)]">
                AuditPal
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const isActive = item.active(pathname)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={[
                      'relative px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200',
                      isActive
                        ? 'text-[var(--accent-ink)] nav-pill-active'
                        : 'text-[var(--text-soft)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.05)]',
                    ].join(' ')}
                  >
                    {item.label}
                    {item.path === '/reports' && reportCount > 0 && (
                      <span className={[
                        'ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                        isActive ? 'bg-black/20 text-[var(--accent-ink)]' : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
                      ].join(' ')}>
                        {reportCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Status chip */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[rgba(0,212,168,0.16)] bg-[rgba(0,212,168,0.06)] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Live</span>
              </div>

              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen((v) => !v)}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[rgba(8,16,24,0.8)] px-3 py-2 transition-all duration-200 hover:border-[rgba(0,212,168,0.3)] hover:bg-[rgba(12,24,34,0.95)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--accent),rgba(0,160,128,0.9))] text-[11px] font-bold uppercase text-[var(--accent-ink)]">
                      {user.name.substring(0, 2)}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-[13px] font-semibold text-[var(--text)] leading-none">{user.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] mt-0.5">{formatRole(user.role)}</p>
                    </div>
                    <svg className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="surface-card-strong absolute right-0 top-[calc(100%+10px)] z-50 w-[min(94vw,420px)] rounded-2xl p-4 shadow-[0_32px_80px_rgba(0,3,6,0.6)]"
                      >
                        {/* Profile tabs */}
                        <div className="mb-4 flex gap-1 rounded-xl border border-[rgba(80,120,130,0.1)] bg-[rgba(6,12,18,0.8)] p-1">
                          {[
                            { id: 'profile', label: 'Profile' },
                            ...(user.role !== 'ORGANIZATION' ? [{ id: 'api-key', label: 'API Key' }, { id: 'agents', label: 'Agents' }] : []),
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveProfileTab(tab.id as any)}
                              className={[
                                'flex-1 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200',
                                activeProfileTab === tab.id
                                  ? 'nav-pill-active'
                                  : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]',
                              ].join(' ')}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-0.5">
                          {activeProfileTab === 'profile' && (
                            <div className="space-y-3">
                              <div className="surface-card-muted rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),rgba(0,160,128,0.9))] text-sm font-bold text-[var(--accent-ink)]">
                                    {user.name.substring(0, 2)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[var(--text)]">{user.name}</p>
                                    <p className="text-[12px] text-[var(--text-soft)]">{user.email}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  <span className="summary-chip">{formatRole(user.role)}</span>
                                  {user.organizationName && <span className="summary-chip">{user.organizationName}</span>}
                                  <span className="summary-chip">Since {formatDate(user.createdAt)}</span>
                                </div>
                              </div>
                              <div className="surface-card-muted rounded-xl p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Workspace</p>
                                <p className="text-[13px] leading-relaxed text-[var(--text-soft)]">{getRoleMessage(user.role)}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="w-full justify-center border border-[var(--border)]" onClick={logout}>
                                Sign out
                              </Button>
                            </div>
                          )}

                          {activeProfileTab === 'api-key' && (
                            <div className="space-y-3">
                              <div className="surface-card-muted rounded-xl p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Submission API</p>
                                <p className="text-[13px] leading-relaxed text-[var(--text-soft)]">
                                  Use the <code className="text-[var(--accent)]">X-API-Key</code> header when posting to <code className="text-[var(--accent)]">/api/v1/reports/submit</code>.
                                </p>
                              </div>
                              {canGenerateApiKey ? (
                                <>
                                  <div className="surface-card-muted rounded-xl p-4 text-[13px] text-[var(--text-soft)] space-y-2.5">
                                    {[
                                      ['Current key', user.apiKeyPreview ?? 'Not generated yet'],
                                      ['Generated',   formatDate(user.apiKeyCreatedAt)],
                                      ['Last used',   formatDate(user.apiKeyLastUsedAt)],
                                    ].map(([label, val]) => (
                                      <div key={label} className="flex items-center justify-between gap-4 border-b border-[rgba(80,120,130,0.1)] pb-2 last:border-0 last:pb-0">
                                        <span>{label}</span>
                                        <span className="font-semibold text-[var(--text)]">{val}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button variant="primary" size="sm" onClick={handleGenerateApiKey} disabled={isGeneratingKey}>
                                      {isGeneratingKey ? 'Generating…' : user.hasApiKey ? 'Regenerate' : 'Generate key'}
                                    </Button>
                                    {generatedApiKey && (
                                      <Button variant="outline" size="sm" onClick={handleCopyApiKey}>
                                        {copyState === 'copied' ? '✓ Copied' : copyState === 'failed' ? 'Failed' : 'Copy key'}
                                      </Button>
                                    )}
                                  </div>
                                  {generatedApiKey && (
                                    <div className="rounded-xl border border-[rgba(0,212,168,0.2)] bg-[rgba(0,212,168,0.08)] p-3">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-2">New key — copy now</p>
                                      <code className="block overflow-x-auto break-all rounded-lg bg-[rgba(6,12,18,0.9)] px-3 py-2.5 text-[12px] text-[var(--accent-strong)]">
                                        {generatedApiKey}
                                      </code>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="surface-card-muted rounded-xl p-4 text-[13px] leading-relaxed text-[var(--text-soft)]">
                                  API keys are available for bounty hunters and admins.
                                </div>
                              )}
                            </div>
                          )}

                          {activeProfileTab === 'agents' && (
                            <div className="space-y-3">
                              <form onSubmit={handleRegisterAgent} className="surface-card-muted rounded-xl p-4 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Register agent</p>
                                {[
                                  { key: 'name',         label: 'Agent name',   placeholder: 'Sentinel Delta' },
                                  { key: 'headline',     label: 'Headline',     placeholder: 'Repo-native triage for smart contract queues' },
                                  { key: 'capabilities', label: 'Capabilities', placeholder: 'replay analysis, invariant review' },
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key}>
                                    <label className="field-label">{label}</label>
                                    <input
                                      value={(agentForm as any)[key]}
                                      onChange={(e) => setAgentForm((c) => ({ ...c, [key]: e.target.value }))}
                                      className="field"
                                      placeholder={placeholder}
                                    />
                                  </div>
                                ))}
                                <div>
                                  <label className="field-label">Summary</label>
                                  <textarea
                                    value={agentForm.summary}
                                    onChange={(e) => setAgentForm((c) => ({ ...c, summary: e.target.value }))}
                                    className="field-area"
                                    placeholder="Describe what the agent specializes in…"
                                    style={{ minHeight: 80 }}
                                  />
                                </div>
                                {agentError   && <p className="rounded-lg bg-[var(--critical-soft)] px-3 py-2 text-[12px] text-[var(--critical-text)]">{agentError}</p>}
                                {agentSuccess && <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[12px] text-[var(--success-text)]">{agentSuccess}</p>}
                                <Button variant="primary" size="sm" className="w-full" disabled={isRegisteringAgent}>
                                  {isRegisteringAgent ? 'Publishing…' : 'Register agent'}
                                </Button>
                              </form>

                              <div className="space-y-2">
                                {myAgents.length > 0 ? myAgents.map((agent) => (
                                  <div key={agent.id} className="surface-card-muted rounded-xl p-3">
                                    <p className="font-semibold text-[var(--text)] text-[13px]">{agent.name}</p>
                                    <p className="text-[12px] text-[var(--text-soft)] mt-0.5">{agent.headline}</p>
                                  </div>
                                )) : (
                                  <p className="text-[13px] text-[var(--text-soft)] text-center py-4">No agents registered yet.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={onLogin}>
                  Sign in
                </Button>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[rgba(8,16,24,0.8)] text-[var(--text-soft)] transition hover:text-[var(--text)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden lg:hidden"
              >
                <div className="accent-line mt-3 mb-3" />
                <div className="flex flex-wrap gap-2 pb-1">
                  {visibleNavItems.map((item) => {
                    const isActive = item.active(pathname)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={[
                          'rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200',
                          isActive
                            ? 'nav-pill-active'
                            : 'border border-[var(--border)] bg-[rgba(8,16,24,0.7)] text-[var(--text-soft)] hover:text-[var(--text)]',
                        ].join(' ')}
                      >
                        {item.label}
                        {item.path === '/reports' && reportCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-strong)]">
                            {reportCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </header>
  )
}
