import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../common/Button'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

const navItems: { label: string; path: string; active: (pathname: string) => boolean }[] = [
  {
    label: 'Home',
    path: '/',
    active: (path) => path === '/',
  },
  {
    label: 'Bounties',
    path: '/bounties',
    active: (path) => path.startsWith('/bounties') || path.startsWith('/bounty/') || path.startsWith('/programs') || path.startsWith('/program/'),
  },
  {
    label: 'Reports',
    path: '/reports',
    active: (path) => path === '/reports',
  },
  {
    label: 'Agent Leaderboard',
    path: '/agents/leaderboard',
    active: (path) => path.startsWith('/agent'),
  },
]

interface TopNavProps {
  pathname: string
  reportCount: number
  onLogin: () => void
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value?: string) {
  if (!value) return 'Not yet'

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function TopNav({ pathname, reportCount, onLogin }: TopNavProps) {
  const { user, logout, generateApiKey } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'api-key' | 'agents'>('profile')
  const profileRef = useRef<HTMLDivElement | null>(null)
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [agentSuccess, setAgentSuccess] = useState<string | null>(null)
  const [myAgents, setMyAgents] = useState<any[]>([])
  const [agentForm, setAgentForm] = useState({
    name: '',
    headline: '',
    summary: '',
    capabilities: '',
  })

  useEffect(() => {
    if (activeProfileTab === 'agents' && user) {
      fetchMyAgents()
    }
  }, [activeProfileTab, user?.id])

  const fetchMyAgents = async () => {
    try {
      const res = await api.get<any[]>('/agents/mine')
      if (res.success) {
        setMyAgents(res.data)
      }
    } catch (error) {
      console.error('Failed to fetch agents', error)
    }
  }

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setAgentError(null)
    setAgentSuccess(null)

    if (!agentForm.name || !agentForm.headline || !agentForm.summary) {
      setAgentError('Please fill in all required fields.')
      return
    }

    if (agentForm.name.length < 2) {
      setAgentError('Agent name must be at least 2 characters.')
      return
    }
    if (agentForm.headline.length < 5) {
      setAgentError('Headline must be at least 5 characters.')
      return
    }
    if (agentForm.summary.length < 10) {
      setAgentError('Summary must be at least 10 characters for better indexing.')
      return
    }

    setIsRegisteringAgent(true)
    try {
      const capabilitiesArr = agentForm.capabilities.split(',').map((s) => s.trim()).filter(Boolean)
      if (capabilitiesArr.length === 0) {
        setAgentError('Please add at least one capability.')
        setIsRegisteringAgent(false)
        return
      }

      const res = await api.post('/agents', {
        ...agentForm,
        capabilities: capabilitiesArr,
      })
      if (res.success) {
        setAgentForm({ name: '', headline: '', summary: '', capabilities: '' })
        setAgentSuccess('Agent registered successfully!')
        fetchMyAgents()
      } else {
        setAgentError(res.error || 'Failed to register agent.')
      }
    } catch (error) {
      console.error('Failed to register agent', error)
      setAgentError('An unexpected error occurred.')
    } finally {
      setIsRegisteringAgent(false)
    }
  }

  const canGenerateApiKey = user?.role === 'BOUNTY_HUNTER' || user?.role === 'ADMIN'

  useEffect(() => {
    if (!isProfileOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isProfileOpen])

  useEffect(() => {
    setGeneratedApiKey(null)
    setCopyState('idle')
    setIsProfileOpen(false)
  }, [user?.id])

  const handleGenerateApiKey = async () => {
    if (!canGenerateApiKey) return

    setIsGeneratingKey(true)
    const apiKey = await generateApiKey()
    setIsGeneratingKey(false)

    if (!apiKey) {
      window.alert('Unable to generate an API key right now.')
      return
    }

    setGeneratedApiKey(apiKey)
    setCopyState('idle')
  }

  const handleCopyApiKey = async () => {
    if (!generatedApiKey) return

    try {
      await navigator.clipboard.writeText(generatedApiKey)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <header className="sticky top-4 z-40">
      <div className="rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.88)] px-5 py-4 shadow-[0_24px_70px_rgba(30,24,16,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-full px-2 py-1 text-left transition hover:bg-[#f6f2ea]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#171717] bg-[#171717] text-lg font-semibold text-white">
              A
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#171717]">AuditPal</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7b7468]">Security research workspace</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center justify-center gap-2">
            {navItems.map((item) => {
              const isActive = item.active(pathname)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`rounded-full px-4 py-2.5 text-sm transition ${isActive
                    ? 'bg-[#171717] !text-white'
                    : 'text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]'
                    }`}
                >
                  {item.label}
                  {item.path === '/reports' && reportCount > 0 && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white/15 !text-white' : 'bg-[#ebe4d8] !text-[#171717]'}`}>
                      {reportCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {user ? (
              <div className="relative mr-2" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-full border border-[#ebe4d8] bg-[#f6f2ea] px-3 py-1.5 text-left transition hover:border-[#171717]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] text-[10px] font-bold text-white uppercase">
                    {user.name.substring(0, 2)}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-[#171717] leading-none">{user.name}</p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wider text-[#7b7468]">{formatRole(user.role)}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#7b7468] transition ${isProfileOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"></path></svg>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(92vw,380px)] rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_28px_70px_rgba(30,24,16,0.14)]">
                    <div className="mb-4 flex gap-1 rounded-full border border-[#ebe4d8] bg-[#fbf8f2] p-1">
                      <button
                        onClick={() => setActiveProfileTab('profile')}
                        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeProfileTab === 'profile' ? 'bg-[#171717] text-white' : 'text-[#7b7468] hover:bg-[#ebe4d8]'}`}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setActiveProfileTab('api-key')}
                        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeProfileTab === 'api-key' ? 'bg-[#171717] text-white' : 'text-[#7b7468] hover:bg-[#ebe4d8]'}`}
                      >
                        API Key
                      </button>
                      <button
                        onClick={() => setActiveProfileTab('agents')}
                        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeProfileTab === 'agents' ? 'bg-[#171717] text-white' : 'text-[#7b7468] hover:bg-[#ebe4d8]'}`}
                      >
                        Agents
                      </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      {activeProfileTab === 'profile' && (
                        <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Profile</p>
                          <p className="mt-3 text-lg font-semibold text-[#171717]">{user.name}</p>
                          <p className="mt-1 text-sm text-[#5f5a51]">{user.email}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#e3dbcf] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6f695f]">
                              {formatRole(user.role)}
                            </span>
                            {user.organizationName && (
                              <span className="rounded-full border border-[#e3dbcf] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6f695f]">
                                {user.organizationName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {activeProfileTab === 'api-key' && (
                        <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Submission API key</p>
                              <p className="mt-2 text-sm leading-7 text-[#4b463f]">
                                Generate a platform API key here, then use it in the <code>X-API-Key</code> header when posting reports to <code>/api/v1/reports/submit</code>.
                              </p>
                            </div>
                          </div>

                          {canGenerateApiKey ? (
                            <>
                              <div className="mt-4 space-y-3 text-sm text-[#4b463f]">
                                <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd3] pb-3">
                                  <span className="text-[#7b7468]">Current key</span>
                                  <span className="text-right text-[#171717]">{user.apiKeyPreview ?? 'Not generated yet'}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd3] pb-3">
                                  <span className="text-[#7b7468]">Generated</span>
                                  <span className="text-right text-[#171717]">{formatDate(user.apiKeyCreatedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[#7b7468]">Last used</span>
                                  <span className="text-right text-[#171717]">{formatDate(user.apiKeyLastUsedAt)}</span>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <Button variant="primary" size="sm" onClick={handleGenerateApiKey} disabled={isGeneratingKey}>
                                  {isGeneratingKey ? 'Generating...' : user.hasApiKey ? 'Regenerate API key' : 'Generate API key'}
                                </Button>
                                {generatedApiKey && (
                                  <Button variant="outline" size="sm" onClick={handleCopyApiKey}>
                                    {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy key'}
                                  </Button>
                                )}
                              </div>

                              {generatedApiKey && (
                                <div className="mt-4 rounded-[20px] border border-[#e3dbcf] bg-white p-4">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">New key</p>
                                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">This raw key is only shown now. Save it in your agent or automation secret store.</p>
                                  <pre className="mt-3 overflow-x-auto rounded-[18px] border border-[#ebe4d8] bg-[#fbf8f2] p-3 text-xs leading-6 text-[#171717]"><code>{generatedApiKey}</code></pre>
                                </div>
                              )}

                              <div className="mt-4 rounded-[20px] border border-[#e3dbcf] bg-white p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Request header</p>
                                <pre className="mt-3 overflow-x-auto rounded-[18px] border border-[#ebe4d8] bg-[#fbf8f2] p-3 text-xs leading-6 text-[#171717]"><code>X-API-Key: &lt;auditpal_platform_api_key&gt;</code></pre>
                              </div>
                            </>
                          ) : (
                            <div className="mt-4 rounded-[20px] border border-[#e3dbcf] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                              API key generation is available for bounty hunter and admin accounts because the submission API accepts hunter-style report intake.
                            </div>
                          )}
                        </div>
                      )}

                      {activeProfileTab === 'agents' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Register new agent</p>
                            <form onSubmit={handleRegisterAgent} className="mt-4 space-y-3">
                              <input
                                type="text"
                                placeholder="Agent name"
                                value={agentForm.name}
                                onChange={(e) => setAgentForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full rounded-xl border border-[#d9d1c4] bg-white px-3 py-2 text-sm outline-none focus:border-[#171717]"
                                required
                              />
                              <input
                                type="text"
                                placeholder="Headline"
                                value={agentForm.headline}
                                onChange={(e) => setAgentForm((f) => ({ ...f, headline: e.target.value }))}
                                className="w-full rounded-xl border border-[#d9d1c4] bg-white px-3 py-2 text-sm outline-none focus:border-[#171717]"
                                required
                              />
                              <textarea
                                placeholder="Summary"
                                value={agentForm.summary}
                                onChange={(e) => setAgentForm((f) => ({ ...f, summary: e.target.value }))}
                                className="w-full rounded-xl border border-[#d9d1c4] bg-white px-3 py-2 text-sm outline-none focus:border-[#171717]"
                                rows={2}
                              />
                              <input
                                type="text"
                                placeholder="Capabilities (comma separated)"
                                value={agentForm.capabilities}
                                onChange={(e) => setAgentForm((f) => ({ ...f, capabilities: e.target.value }))}
                                className="w-full rounded-xl border border-[#d9d1c4] bg-white px-3 py-2 text-sm outline-none focus:border-[#171717]"
                              />
                              <Button variant="primary" size="sm" className="w-full" disabled={isRegisteringAgent}>
                                {isRegisteringAgent ? 'Registering...' : 'Register Agent'}
                              </Button>
                            </form>
                          </div>

                          {myAgents.length > 0 ? (
                            <div className="space-y-3">
                              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Active Agents</p>
                              <div className="space-y-2">
                                {myAgents.map((agent) => (
                                  <div key={agent.id} className="flex items-center gap-3 rounded-2xl border border-[#ebe4d8] bg-white p-3 shadow-sm transition hover:border-[#171717]">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#315e50] text-[10px] font-bold text-white uppercase">
                                      {agent.logoMark}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                      <p className="truncate text-xs font-semibold text-[#171717]">{agent.name}</p>
                                      <p className="truncate text-[10px] text-[#7b7468]">{agent.headline}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[24px] border border-dashed border-[#d9d1c4] p-6 text-center">
                              <p className="text-sm text-[#7b7468]">No active agents yet.</p>
                              <p className="mt-1 text-xs text-[#a39c91]">Register your first agent above.</p>
                            </div>
                          )}

                          {agentError && (
                            <div className="mx-1 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                              {agentError}
                            </div>
                          )}
                          {agentSuccess && (
                            <div className="mx-1 rounded-xl bg-green-50 p-3 text-xs text-green-600 border border-green-100">
                              {agentSuccess}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        logout()
                        setIsProfileOpen(false)
                      }}
                      className="mt-4 w-full rounded-full border border-[#d9d1c4] px-4 py-2.5 text-sm text-[#5f5a51] transition hover:border-[#171717] hover:text-[#171717]"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="rounded-full border border-[#d9d1c4] px-4 py-2 text-sm text-[#5f5a51] transition hover:border-[#171717] hover:text-[#171717]"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
