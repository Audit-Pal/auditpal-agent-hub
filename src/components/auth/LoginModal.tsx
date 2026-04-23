import { memo, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
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

const researcherFeatures = [
  'Browse hundreds of active bounty programs across multiple platforms.',
  'Submit findings with structured templates and track status in real-time.',
  'Build reputation and earn rewards for discovering valid vulnerabilities.',
]

const organizationFeatures = [
  'Create and publish bug bounty programs with custom reward structures.',
  'Define scope, configure reviewers, and manage the entire triage workflow.',
  'Review incoming submissions and pay out rewards for valid findings.',
]

export const LoginModal = memo(function LoginModal({ isOpen, onClose, initialRole = 'agent' }: LoginModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')

  const isOrgRole = initialRole === 'organization'
  const defaultEmail = isOrgRole ? demoCredentials.ORGANIZATION.email : demoCredentials.BOUNTY_HUNTER.email
  const defaultPassword = isOrgRole ? demoCredentials.ORGANIZATION.password : demoCredentials.BOUNTY_HUNTER.password
  const defaultName = isOrgRole ? 'New Organisation' : 'New Agent'
  const defaultUserRole: UserRole = isOrgRole ? 'ORGANIZATION' : 'BOUNTY_HUNTER'

  const [email, setEmail] = useState<string>(defaultEmail)
  const [password, setPassword] = useState<string>(defaultPassword)
  const [name, setName] = useState<string>(defaultName)
  const [role, setRole] = useState<UserRole>(defaultUserRole)
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setEmail(defaultEmail)
    setPassword(defaultPassword)
    setName(defaultName)
    setRole(defaultUserRole)
    setOrganizationName('')
    setMode('login')
    setError(null)
    setShowPassword(false)
  }, [defaultEmail, defaultName, defaultPassword, defaultUserRole, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

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

  if (!isOpen) {
    return null
  }

  const features = isOrgRole ? organizationFeatures : researcherFeatures

  return (
    <div className="fixed inset-0 z-[250] overflow-y-auto bg-[#06080b] animate-fade-in font-['Space_Grotesk',sans-serif]">
      <div className="min-h-screen w-full flex flex-col lg:flex-row relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 lg:top-10 lg:right-10 z-[260] flex items-center justify-center h-12 w-12 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0a0d12] text-[#7f8896] transition duration-300 hover:border-[#0fca8a] hover:text-[#0fca8a]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <aside className="w-full lg:w-5/12 flex-shrink-0 flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative overflow-hidden bg-[rgba(15,202,138,0.02)] border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.04)]">
          <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,rgba(15,202,138,0.1)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative z-10 w-full max-w-md mx-auto lg:mx-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
              {isOrgRole ? 'Organization' : 'Security Researcher'}
            </p>
            <h2 className="font-['Fraunces',serif] text-4xl lg:text-5xl tracking-tight text-[#eef1f6] leading-[1.1]">
              {isOrgRole ? 'Launch and manage your security programs.' : 'Find vulnerabilities, earn rewards.'}
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[#7f8896]">
              {isOrgRole
                ? 'Create bug bounty programs, configure reward tiers, manage scope, and review security submissions from researchers worldwide.'
                : 'Browse active bounty programs, submit security findings, track triage status, and earn rewards for valid vulnerabilities.'}
            </p>

            <div className="mt-10 space-y-4">
              {features.map((item, index) => (
                <div
                  key={item}
                  className="rounded-none border-l-2 border-[#0fca8a]/40 bg-transparent pl-5 py-1"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0fca8a]">Feature 0{index + 1}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#7f8896]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="w-full lg:w-7/12 flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative">
          <div className="w-full max-w-md mx-auto lg:ml-12">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-2">{mode === 'login' ? 'Sign in' : 'Create account'}</p>
                <h3 className="text-3xl font-semibold text-[#eef1f6]">
                  {mode === 'login' ? 'Access your workspace' : 'Choose your role'}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#7f8896]">
                  {mode === 'login'
                    ? 'Use one of the demo roles below or your own credentials.'
                    : 'Create either a bounty hunter or organization account without leaving the frontend.'}
                </p>
              </div>
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
                    'flex-1 rounded-full px-4 py-2.5 text-sm font-bold uppercase tracking-[0.12em] transition-colors duration-150',
                    mode === item.id ? 'bg-[#0fca8a] text-[#06080b]' : 'text-[var(--text-muted)] hover:bg-[rgba(13,26,37,0.94)]',
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
                      className="summary-chip"
                    >
                      Organization demo
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDemoCredentials('ADMIN')}
                      className="summary-chip"
                    >
                      Admin demo
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => applyDemoCredentials('BOUNTY_HUNTER')}
                      className="summary-chip"
                    >
                      Researcher demo
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDemoCredentials('ADMIN')}
                      className="summary-chip"
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
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <>
                  {isOrgRole && (
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
        </div>
      </div>
    </div>
  )
})
