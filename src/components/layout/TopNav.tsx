import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { api } from '../../lib/api'
import type { Agent } from '../../types/platform'

const navItems: { label: string; path: string; active: (pathname: string) => boolean; isExternal?: boolean }[] = [
  { label: 'Home', path: '/', active: (p) => p === '/' },
  { label: 'Bounties', path: '/bounties', active: (p) => p.startsWith('/bounties') || p.startsWith('/bounty/') || p.startsWith('/programs') || p.startsWith('/program/') },
  { label: 'Submissions', path: '/reports', active: (p) => p === '/reports' },
  { label: 'Agents', path: '/agents/leaderboard', active: (p) => p.startsWith('/agent') },
  { label: 'Subnet ↗', path: 'https://subnet.auditpal.io/', active: () => false, isExternal: true },
  { label: 'Docs ↗', path: '/docs.html', active: () => false, isExternal: true },
  { label: 'Org Workspace', path: '/org/dashboard', active: (p) => p.startsWith('/org/') },
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
    case 'ADMIN': return 'Oversee researcher, validator, and platform operations.'
    case 'GATEKEEPER': return 'Review findings and escalate signal to the validator queue.'
    case 'VALIDATOR': return 'Finalize criticality, pay valid findings, keep trust high.'
    default: return 'Browse live bounty programs, submit findings, track triage.'
  }
}

export function TopNav({ pathname, reportCount, onLogin }: TopNavProps) {
  const { user, logout, generateApiKey } = useAuth()
  const { showToast } = useToast()
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
  const [myAgents, setMyAgents] = useState<Agent[]>([])
  const [agentForm, setAgentForm] = useState({
    name: '', headline: '', summary: '', capabilities: '',
    accentTone: 'mint', guardrails: '',
    supportedSurfaces: [] as string[],
    supportedTechnologies: '',
  })
  const [agentTools, setAgentTools] = useState<{ name: string; access: string; useCase: string }[]>([])
  const [agentFlow, setAgentFlow] = useState<{ title: string; description: string }[]>([])
  const [openAgentSection, setOpenAgentSection] = useState<'register' | 'list' | 'none'>('list')
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const profileRef = useRef<HTMLDivElement | null>(null)

  const canGenerateApiKey = user?.role === 'BOUNTY_HUNTER' || user?.role === 'ADMIN'

  const visibleNavItems = navItems.filter((item) => {
    if (item.label === 'Bounties' && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Agents' && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Subnet ↗' && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Docs ↗' && user?.role === 'ORGANIZATION') return false
    if (item.label === 'Org Workspace') return user?.role === 'ORGANIZATION'
    return true
  })

  // Close mobile menu on route change
  useEffect(() => { setIsMobileMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (activeProfileTab !== 'agents' || !user || user.role === 'ORGANIZATION') return
    api.get<Agent[]>('/agents/mine').then((res) => { if (res.success) setMyAgents(res.data) })
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
    if (!key) { showToast('Unable to generate an API key right now.', 'error'); return }
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
        const guardrails = agentForm.guardrails.split(',').map((s) => s.trim()).filter(Boolean)
        const supportedTechnologies = agentForm.supportedTechnologies.split(',').map((s) => s.trim()).filter(Boolean)
        const payload = {
          ...agentForm,
          capabilities,
          guardrails,
          supportedTechnologies,
          supportedSurfaces: agentForm.supportedSurfaces,
          tools: agentTools.filter(t => t.name && t.useCase),
          runtimeFlow: agentFlow.filter(s => s.title && s.description).map((s, i) => ({ ...s, order: i + 1 })),
        }
        const res = editingAgentId
          ? await api.patch(`/agents/${editingAgentId}`, payload)
          : await api.post('/agents', payload)

        if (res.success) {
          const refreshed = await api.get<Agent[]>('/agents/mine')
          if (refreshed.success) setMyAgents(refreshed.data)
          setAgentForm({ name: '', headline: '', summary: '', capabilities: '', accentTone: 'mint', guardrails: '', supportedSurfaces: [], supportedTechnologies: '' })
          setAgentTools([])
          setAgentFlow([])
          setAgentSuccess(editingAgentId ? 'Agent updated successfully.' : 'Agent registered successfully.')
          setEditingAgentId(null)
      } else { setAgentError(res.error || `Failed to ${editingAgentId ? 'update' : 'register'} agent.`) }
    } catch { setAgentError('An unexpected error occurred.') }
    finally { setIsRegisteringAgent(false) }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[200] h-[60px] flex items-center justify-between px-5 md:px-[2.5rem] bg-[rgba(6,8,11,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.06)]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-[9px] text-[1rem] font-semibold tracking-[0.04em] text-[#eef1f6] transition-opacity hover:opacity-80 decoration-none">
        <img src="/AuditPal_Logo.webp" alt="AuditPal Logo" className="h-[34px] w-auto object-contain" />
        AuditPal
      </Link>

      {/* Desktop Nav */}
      <div className="hidden lg:flex items-center gap-[0.5rem]">
        {visibleNavItems.map((item) => {
          const isActive = item.active(pathname)
          if (item.isExternal) {
            return (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="px-[12px] py-[6px] rounded-[6px] text-[0.82rem] font-[400] transition-colors duration-200 decoration-none relative text-[#7f8896] hover:text-[#eef1f6]"
              >
                {item.label}
              </a>
            )
          }
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-[12px] py-[6px] rounded-[6px] text-[0.82rem] font-[400] transition-colors duration-200 decoration-none relative ${isActive ? 'text-[#0fca8a]' : 'text-[#7f8896] hover:text-[#eef1f6]'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="topnavTabBadge"
                  className="absolute inset-0 border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] rounded-[6px] z-[-1]"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
              {item.path === '/reports' && reportCount > 0 && (
                <span className="relative z-10 ml-[6px] rounded-full bg-[rgba(15,202,138,0.15)] px-[6px] py-[2px] text-[9px] font-bold text-[#0fca8a]">
                  {reportCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-[12px]">

        {user ? (
          <>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex items-center gap-[8px] rounded-[5px] border border-[rgba(255,255,255,0.11)] bg-transparent px-[14px] py-[6px] transition-all duration-200 hover:border-[rgba(255,255,255,0.18)]"
                title="Click to view profile and logout"
              >
                <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-[#0fca8a] text-[9px] font-bold uppercase text-[#06080b]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : user.role === 'ORGANIZATION' ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21V4a2 2 0 012-2h12a2 2 0 012 2v17" /></svg>
                  ) : user.role === 'BOUNTY_HUNTER' ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M15 20v2M2 15h2M20 15h2" /></svg>
                  ) : (
                    user.name.substring(0, 2)
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-bold text-[var(--text)] leading-none">
                    {user.role === 'ORGANIZATION' ? ((user as any).organizationName || user.name) : user.name}
                  </p>
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-[calc(100%+14px)] z-[100] w-[min(94vw,420px)] bg-[#030608] border border-[rgba(255,255,255,0.06)] p-0 shadow-2xl"
                  >
                    {/* Profile tabs */}
                    <div className="flex bg-[#06080b]">
                      {[
                        { id: 'profile', label: 'Profile' },
                        ...(user.role !== 'ORGANIZATION' ? [{ id: 'api-key', label: 'API Key' }, { id: 'agents', label: 'Agents' }] : []),
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveProfileTab(tab.id as 'profile' | 'api-key' | 'agents')}
                          className={[
                            'flex-1 py-[14px] text-[11px] font-bold uppercase tracking-[0.12em] transition-colors',
                            activeProfileTab === tab.id
                              ? 'border-b-2 border-[#0fca8a] text-[var(--text)] bg-[rgba(255,255,255,0.02)]'
                              : 'border-b-2 border-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text)]',
                          ].join(' ')}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                      {activeProfileTab === 'profile' && (
                        <div className="flex flex-col">
                          <div className="p-5 border-b border-[rgba(255,255,255,0.04)]">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#0fca8a] text-sm font-bold text-[#06080b]">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : user.role === 'ORGANIZATION' ? (
                                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21V4a2 2 0 012-2h12a2 2 0 012 2v17" /></svg>
                                ) : user.role === 'BOUNTY_HUNTER' ? (
                                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M15 20v2M2 15h2M20 15h2" /></svg>
                                ) : (
                                  user.name.substring(0, 2)
                                )}
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
                          <div className="p-5 border-b border-[rgba(255,255,255,0.04)] mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Workspace</p>
                            <p className="text-[13px] leading-relaxed text-[var(--text-soft)]">{getRoleMessage(user.role)}</p>
                          </div>
                          <div className="px-5 pb-5">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full justify-center"
                              onClick={logout}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                            </Button>
                          </div>
                        </div>
                      )}

                      {activeProfileTab === 'api-key' && (
                        <div className="flex flex-col">
                          <div className="p-5 border-b border-[rgba(255,255,255,0.04)]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Submission API</p>
                            <p className="text-[13px] leading-relaxed text-[var(--text-soft)]">
                              Use the <code className="text-[var(--accent)]">X-API-Key</code> header when posting to <code className="text-[var(--accent)]">/api/v1/reports/submit</code>.
                            </p>
                          </div>
                          {canGenerateApiKey ? (
                            <div className="p-5 flex flex-col gap-5">
                              <div className="text-[13px] text-[var(--text-soft)] space-y-2.5">
                                {[
                                  ['Current key', user.apiKeyPreview ?? 'Not generated yet'],
                                  ['Generated', formatDate(user.apiKeyCreatedAt)],
                                  ['Last used', formatDate(user.apiKeyLastUsedAt)],
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
                                <div className="border border-[rgba(0,212,168,0.2)] bg-[rgba(0,212,168,0.08)] p-4 rounded-none">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-2">New key — copy now</p>
                                  <code className="block overflow-x-auto break-all rounded-lg bg-[rgba(6,12,18,0.9)] px-3 py-2.5 text-[12px] text-[var(--accent-strong)]">
                                    {generatedApiKey}
                                  </code>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-5 text-[13px] leading-relaxed text-[var(--text-soft)]">
                              API keys are available for bounty hunters and admins.
                            </div>
                          )}
                        </div>
                      )}

                      {activeProfileTab === 'agents' && (
                        <div className="flex flex-col">
                          {/* Register Agent Accordion */}
                          <div className="border-b border-[rgba(255,255,255,0.04)]">
                            <div
                              onClick={() => setOpenAgentSection(v => v === 'register' ? 'none' : 'register')}
                              className="w-full cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.01)]"
                            >
                              <div className="p-5 flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                  {editingAgentId ? 'Edit agent' : 'Register agent'}
                                </p>
                                {editingAgentId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingAgentId(null)
                                      setAgentForm({ name: '', headline: '', summary: '', capabilities: '', accentTone: 'mint', guardrails: '', supportedSurfaces: [], supportedTechnologies: '' })
                                      setAgentTools([])
                                      setAgentFlow([])
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-strong)] hover:opacity-80"
                                  >
                                    Cancel Edit
                                  </button>
                                )}
                                {!editingAgentId && (
                                  <svg className={`h-4 w-4 transition-transform duration-200 ${openAgentSection === 'register' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                )}
                              </div>
                            </div>
                            <AnimatePresence>
                              {openAgentSection === 'register' && (
                                <motion.form
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                  onSubmit={handleRegisterAgent}
                                >
                                  <div className="px-5 pb-5 space-y-4">
                                    <div>
                                      <label className="field-label">Agent name</label>
                                      <input
                                        value={agentForm.name}
                                        onChange={(e) => setAgentForm((c) => ({ ...c, name: e.target.value }))}
                                        className="field"
                                        placeholder="Sentinel Delta"
                                      />
                                    </div>
                                    <div>
                                      <label className="field-label">Headline</label>
                                      <input
                                        value={agentForm.headline}
                                        onChange={(e) => setAgentForm((c) => ({ ...c, headline: e.target.value }))}
                                        className="field"
                                        placeholder="Repo-native triage for smart contract queues"
                                      />
                                    </div>
                                    <div>
                                      <label className="field-label">Capabilities</label>
                                      <input
                                        value={agentForm.capabilities}
                                        onChange={(e) => setAgentForm((c) => ({ ...c, capabilities: e.target.value }))}
                                        className="field"
                                        placeholder="replay analysis, invariant review"
                                      />
                                    </div>
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

                                    {/* Coverage Map */}
                                    <div>
                                      <label className="field-label">Surfaces <span className="text-[var(--text-muted)] normal-case font-normal">(Coverage Map)</span></label>
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN'] as const).map((s) => (
                                          <button
                                            key={s}
                                            type="button"
                                            onClick={() => setAgentForm((c) => ({
                                              ...c,
                                              supportedSurfaces: c.supportedSurfaces.includes(s)
                                                ? c.supportedSurfaces.filter((x) => x !== s)
                                                : [...c.supportedSurfaces, s]
                                            }))}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] border transition-colors ${
                                              agentForm.supportedSurfaces.includes(s)
                                                ? 'border-[rgba(15,202,138,0.4)] bg-[rgba(15,202,138,0.1)] text-[#0fca8a]'
                                                : 'border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:border-[rgba(255,255,255,0.2)]'
                                            }`}
                                          >
                                            {s.replace('_', ' ')}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="field-label">Technologies <span className="text-[var(--text-muted)] normal-case font-normal">(comma-sep)</span></label>
                                      <input
                                        value={agentForm.supportedTechnologies}
                                        onChange={(e) => setAgentForm((c) => ({ ...c, supportedTechnologies: e.target.value }))}
                                        className="field"
                                        placeholder="Solidity, Rust, EVM, Move"
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="field-label">Accent Tone</label>
                                        <select
                                          value={agentForm.accentTone}
                                          onChange={(e) => setAgentForm((c) => ({ ...c, accentTone: e.target.value }))}
                                          className="field"
                                        >
                                          {['mint', 'violet', 'orange', 'ink', 'blue', 'rose'].map((t) => (
                                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="field-label">Guardrails <span className="text-[var(--text-muted)] normal-case font-normal">(comma-sep)</span></label>
                                        <input
                                          value={agentForm.guardrails}
                                          onChange={(e) => setAgentForm((c) => ({ ...c, guardrails: e.target.value }))}
                                          className="field"
                                          placeholder="no PII, on-chain only"
                                        />
                                      </div>
                                    </div>

                                    {/* Execution Modules */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="field-label mb-0">Execution Modules</label>
                                        <button
                                          type="button"
                                          onClick={() => setAgentTools(t => [...t, { name: '', access: 'READ_ONLY', useCase: '' }])}
                                          className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0fca8a] hover:opacity-75 transition-opacity"
                                        >+ Add module</button>
                                      </div>
                                      {agentTools.length === 0 && (
                                        <p className="text-[11px] text-[var(--text-muted)] italic">No modules added yet.</p>
                                      )}
                                      <div className="space-y-2">
                                        {agentTools.map((tool, i) => (
                                          <div key={i} className="border border-[rgba(255,255,255,0.06)] p-2.5 rounded-lg space-y-2 relative">
                                            <button
                                              type="button"
                                              onClick={() => setAgentTools(t => t.filter((_, j) => j !== i))}
                                              className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--critical-text)] text-[14px] leading-none"
                                            >×</button>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="field-label text-[9px]">Name</label>
                                                <input
                                                  value={tool.name}
                                                  onChange={e => setAgentTools(t => t.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                                  className="field py-1 text-[12px]"
                                                  placeholder="Etherscan API"
                                                />
                                              </div>
                                              <div>
                                                <label className="field-label text-[9px]">Access</label>
                                                <select
                                                  value={tool.access}
                                                  onChange={e => setAgentTools(t => t.map((x, j) => j === i ? { ...x, access: e.target.value } : x))}
                                                  className="field py-1 text-[12px]"
                                                >
                                                  {['READ_ONLY', 'READ_WRITE', 'EXECUTE'].map(a => (
                                                    <option key={a} value={a}>{a.replace('_', '-')}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="field-label text-[9px]">Use Case</label>
                                              <input
                                                value={tool.useCase}
                                                onChange={e => setAgentTools(t => t.map((x, j) => j === i ? { ...x, useCase: e.target.value } : x))}
                                                className="field py-1 text-[12px]"
                                                placeholder="Resolves contract source and deployment tx"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Runtime Flow */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="field-label mb-0">Runtime Flow</label>
                                        <button
                                          type="button"
                                          onClick={() => setAgentFlow(f => [...f, { title: '', description: '' }])}
                                          className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0fca8a] hover:opacity-75 transition-opacity"
                                        >+ Add stage</button>
                                      </div>
                                      {agentFlow.length === 0 && (
                                        <p className="text-[11px] text-[var(--text-muted)] italic">No stages added yet.</p>
                                      )}
                                      <div className="space-y-2">
                                        {agentFlow.map((stage, i) => (
                                          <div key={i} className="border border-[rgba(255,255,255,0.06)] p-2.5 rounded-lg space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono text-[9px] text-[var(--text-muted)]">STAGE {i + 1}</span>
                                              <button
                                                type="button"
                                                onClick={() => setAgentFlow(f => f.filter((_, j) => j !== i))}
                                                className="text-[var(--text-muted)] hover:text-[var(--critical-text)] text-[14px] leading-none"
                                              >×</button>
                                            </div>
                                            <div>
                                              <label className="field-label text-[9px]">Title</label>
                                              <input
                                                value={stage.title}
                                                onChange={e => setAgentFlow(f => f.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                                                className="field py-1 text-[12px]"
                                                placeholder="Source Ingestion"
                                              />
                                            </div>
                                            <div>
                                              <label className="field-label text-[9px]">Description</label>
                                              <input
                                                value={stage.description}
                                                onChange={e => setAgentFlow(f => f.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                                                className="field py-1 text-[12px]"
                                                placeholder="Fetches and normalises source code"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {agentError && <p className="border-l-2 border-[var(--critical)] bg-[var(--critical-soft)] px-3 py-2 text-[12px] text-[var(--critical-text)]">{agentError}</p>}
                                    {agentSuccess && <p className="border-l-2 border-[#0fca8a] bg-[rgba(15,202,138,0.08)] px-3 py-2 text-[12px] text-[#0fca8a]">{agentSuccess}</p>}
                                    <Button variant="primary" size="sm" className="w-full mt-2" disabled={isRegisteringAgent}>
                                      {isRegisteringAgent ? (editingAgentId ? 'Updating…' : 'Publishing…') : (editingAgentId ? 'Save Changes' : 'Register agent')}
                                    </Button>
                                  </div>
                                </motion.form>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Your Agents Accordion */}
                          <div>
                            <button
                              onClick={() => setOpenAgentSection(v => v === 'list' ? 'none' : 'list')}
                              className="w-full flex items-center justify-between p-5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                              Your agents ({myAgents.length})
                              <svg className={`h-4 w-4 transition-transform duration-200 ${openAgentSection === 'list' ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <AnimatePresence>
                              {openAgentSection === 'list' && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-5">
                                    {myAgents.length > 0 ? myAgents.map((agent) => (
                                      <div key={agent.id} className="group py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0 first:pt-0 flex items-center justify-between">
                                        <div className="min-w-0 pr-4">
                                          <p className="font-semibold text-[var(--text)] text-[13px] truncate">{agent.name}</p>
                                          <p className="text-[12px] text-[var(--text-soft)] mt-0.5 truncate">{agent.headline}</p>
                                        </div>
                                        <button
                                          onClick={() => {
                                          setAgentForm({
                                              name: agent.name,
                                              headline: agent.headline,
                                              summary: (agent as any).summary || '',
                                              capabilities: (agent.capabilities || []).join(', '),
                                              accentTone: agent.accentTone || 'mint',
                                              guardrails: ((agent as any).guardrails || []).join(', '),
                                              supportedSurfaces: (agent as any).supportedSurfaces || [],
                                              supportedTechnologies: ((agent as any).supportedTechnologies || []).join(', '),
                                            })
                                            setEditingAgentId(agent.id)
                                            setOpenAgentSection('register')
                                          }}
                                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[10px] uppercase font-bold text-[#0fca8a] hover:underline transition-opacity"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    )) : (
                                      <p className="text-[13px] text-[var(--text-soft)] text-center py-4">No agents registered yet.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            <button className="hidden sm:block text-[0.8rem] font-[500] text-[#7f8896] bg-transparent border border-[rgba(255,255,255,0.11)] px-[18px] py-[7px] rounded-[5px] cursor-pointer transition-colors duration-200 hover:text-[#eef1f6] hover:border-[rgba(255,255,255,0.18)]" onClick={onLogin}>Sign In</button>
            <button className="text-[0.8rem] font-[600] text-[#06080b] bg-[#0fca8a] border-none px-[18px] py-[7px] rounded-[5px] cursor-pointer transition-opacity hover:opacity-[0.88]" onClick={onLogin}>Get Access</button>
          </>
        )}

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[5px] border border-[rgba(255,255,255,0.11)] text-[#7f8896] transition hover:text-[#eef1f6]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobileMenuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[60px] left-0 right-0 bg-[#06080b] border-b border-[rgba(255,255,255,0.06)] px-5 py-4 overflow-hidden lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {visibleNavItems.map((item) => {
                const isActive = item.active(pathname)
                if (item.isExternal) {
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.9rem] font-[500] text-[#eef1f6] flex items-center justify-between"
                    >
                      {item.label}
                    </a>
                  )
                }
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-[0.9rem] font-[500] text-[#eef1f6] flex items-center justify-between ${isActive ? 'text-[#0fca8a]' : ''}`}
                  >
                    {item.label}
                    {item.path === '/reports' && reportCount > 0 && (
                      <span className="rounded-full bg-[rgba(15,202,138,0.15)] px-[6px] py-[2px] text-[10px] font-bold text-[#0fca8a]">
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
    </nav>
  )
}
