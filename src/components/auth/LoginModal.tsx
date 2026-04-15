import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../common/Button'
import { useAuth, type UserRole } from '../../contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  initialRole?: 'agent' | 'organization'
}

type AuthMode = 'login' | 'register'

const demoCredentials = {
  BOUNTY_HUNTER: { email: 'hunter@auditpal.io', password: 'Hunter1234!' },
  ORGANIZATION: { email: 'org@auditpal.io', password: 'Org1234!' },
  ADMIN: { email: 'admin@auditpal.io', password: 'Admin1234!' },
} as const

export function LoginModal({ isOpen, onClose, initialRole = 'agent' }: LoginModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')

  const isOrgRole = initialRole === 'organization'
  const defaultEmail = isOrgRole ? demoCredentials.ORGANIZATION.email : demoCredentials.BOUNTY_HUNTER.email
  const defaultPassword = isOrgRole ? demoCredentials.ORGANIZATION.password : demoCredentials.BOUNTY_HUNTER.password
  const defaultName = isOrgRole ? 'New Researcher' : 'New Agent'
  const defaultUserRole: UserRole = isOrgRole ? 'ORGANIZATION' : 'BOUNTY_HUNTER'

  const [email, setEmail] = useState<string>(defaultEmail)
  const [password, setPassword] = useState<string>(defaultPassword)
  const [name, setName] = useState<string>(defaultName)
  const [role, setRole] = useState<UserRole>(defaultUserRole)
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Auto-populate demo credentials when modal opens or role changes
  useEffect(() => {
    if (isOpen) {
      const demoEmail = isOrgRole ? demoCredentials.ORGANIZATION.email : demoCredentials.BOUNTY_HUNTER.email
      const demoPassword = isOrgRole ? demoCredentials.ORGANIZATION.password : demoCredentials.BOUNTY_HUNTER.password
      setEmail(demoEmail)
      setPassword(demoPassword)
      setRole(defaultUserRole)
    }
  }, [isOpen, isOrgRole, defaultUserRole])


  const applyDemoCredentials = (nextRole: keyof typeof demoCredentials) => {
    setMode('login')
    setEmail(demoCredentials[nextRole].email)
    setPassword(demoCredentials[nextRole].password)
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const success =
      mode === 'login'
        ? await login(email, password)
        : await register({
            email,
            password,
            name,
            role,
            organizationName: role === 'ORGANIZATION' ? organizationName || name : undefined,
          })

    setLoading(false)

    if (success) {
      onClose()
      return
    }

    setError(mode === 'login' ? 'Invalid email or password.' : 'Registration failed.')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,38,0.42)] p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card-strong grid w-full max-w-5xl overflow-hidden rounded-[34px] lg:grid-cols-[420px_minmax(0,1fr)]"
          >
        <aside className="bg-[linear-gradient(160deg,rgba(30,186,152,0.18),rgba(9,18,27,0.9))] p-8 md:p-10">
          <p className="section-kicker">{isOrgRole ? 'Organization' : 'Security Researcher'} Workspace</p>
          <h2 className="mt-4 font-serif text-5xl text-[var(--text)]">
            {isOrgRole ? 'Launch and manage your security programs.' : 'Find vulnerabilities, earn rewards.'}
          </h2>
          <p className="mt-5 text-sm leading-8 text-[var(--text-soft)]">
            {isOrgRole
              ? 'Create bug bounty programs, configure reward tiers, manage scope, and review security submissions from researchers worldwide.'
              : 'Browse active bounty programs, submit security findings, track triage status, and earn rewards for valid vulnerabilities.'}
          </p>

          <div className="mt-8 space-y-3">
            {(isOrgRole
              ? [
                  'Create and publish bug bounty programs with custom reward structures.',
                  'Define scope, configure reviewers, and manage the entire triage workflow.',
                  'Review incoming submissions and pay out rewards for valid findings.',
                ]
              : [
                  'Browse hundreds of active bounty programs across multiple platforms.',
                  'Submit findings with structured templates and track status in real-time.',
                  'Build reputation and earn rewards for discovering valid vulnerabilities.',
                ]
            ).map((item, index) => (
              <div
                key={item}
                className="rounded-[22px] border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.8)] p-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Feature {index + 1}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{item}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="p-8 md:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">{mode === 'login' ? 'Sign in' : 'Create account'}</p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">
                {mode === 'login' ? 'Access your workspace' : 'Choose your role and get started'}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                {mode === 'login'
                  ? 'Use one of the demo roles below or your own credentials.'
                  : 'Create either a bounty hunter or organization account without leaving the frontend.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[rgba(13,26,37,0.94)] hover:text-[var(--text)] hover:rotate-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="mb-6 flex gap-2 rounded-full bg-[rgba(7,15,22,0.8)] p-1">
            {[
              { id: 'login', label: 'Log in' },
              { id: 'register', label: 'Register' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id as AuthMode)
                  setError(null)
                }}
                className={[
                  'flex-1 rounded-full px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em] transition-all duration-200',
                  mode === item.id ? 'bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-[#021614]' : 'text-[var(--text-muted)] hover:bg-[rgba(13,26,37,0.94)]',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'login' && (
            <div className="mb-5 flex flex-wrap gap-2">
              {isOrgRole ? (
                <>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('ORGANIZATION')}
                    className="summary-chip hover:scale-105 transition-transform"
                  >
                    Organization demo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('ADMIN')}
                    className="summary-chip hover:scale-105 transition-transform"
                  >
                    Admin demo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('BOUNTY_HUNTER')}
                    className="summary-chip hover:scale-105 transition-transform"
                  >
                    Researcher demo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials('ADMIN')}
                    className="summary-chip hover:scale-105 transition-transform"
                  >
                    Admin demo
                  </button>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="field-label">Name</label>
                <input type="text" value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} className="field" required />
              </div>
            )}

            <div>
              <label className="field-label">Email address</label>
              <input type="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} className="field" required />
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                  className="field !pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text)] transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                {!isOrgRole && (
                  <label className="surface-card-muted flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm text-[var(--text-soft)]">
                    <input
                      type="checkbox"
                      checked={role === 'ORGANIZATION'}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setRole(event.target.checked ? 'ORGANIZATION' : 'BOUNTY_HUNTER')}
                      className="h-4 w-4 rounded border-[rgba(15,23,38,0.14)]"
                    />
                    Registering as an organization
                  </label>
                )}

                {(role === 'ORGANIZATION' || isOrgRole) && (
                  <div>
                    <label className="field-label">Organization name</label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setOrganizationName(event.target.value)}
                      placeholder="Acme Security"
                      className="field"
                      required
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-[18px] border border-[rgba(181,69,52,0.14)] bg-[var(--critical-soft)] px-4 py-3 text-sm font-medium text-[var(--critical-text)]">
                {error}
              </div>
            )}

            <Button variant="primary" size="lg" className="mt-2 w-full justify-center" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : mode === 'login' ? 'Continue to workspace' : 'Create account'}
            </Button>
          </form>

          <div className="subtle-divider mt-8 pt-6 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              {mode === 'login'
                ? 'Need a new role? Switch to Register and create a bounty hunter or organization account.'
                : 'Already have an account? Switch back to Log in and use one of the demo roles.'}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
