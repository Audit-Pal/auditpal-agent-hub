import React, { useState } from 'react'
import { Button } from '../common/Button'
import { useAuth, type UserRole } from '../../contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = 'login' | 'register'

const demoCredentials = {
  BOUNTY_HUNTER: { email: 'hunter@auditpal.io', password: 'Hunter1234!' },
  ORGANIZATION: { email: 'org@auditpal.io', password: 'Org1234!' },
  ADMIN: { email: 'admin@auditpal.io', password: 'Admin1234!' },
} as const

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')

  const [email, setEmail] = useState(demoCredentials.BOUNTY_HUNTER.email)
  const [password, setPassword] = useState(demoCredentials.BOUNTY_HUNTER.password)
  const [name, setName] = useState('New Researcher')
  const [role, setRole] = useState<UserRole>('BOUNTY_HUNTER')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const applyDemoCredentials = (nextRole: keyof typeof demoCredentials) => {
    setMode('login')
    setEmail(demoCredentials[nextRole].email)
    setPassword(demoCredentials[nextRole].password)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
            organizationName: role === 'ORGANIZATION' ? organizationName : undefined,
          })

    setLoading(false)

    if (success) {
      onClose()
      return
    }

    setError(mode === 'login' ? 'Invalid email or password' : 'Registration failed')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Workspace access</p>
            <h2 className="mt-3 text-3xl font-serif text-[#171717]">
              {mode === 'login' ? 'Log in to AuditPal' : 'Create your role'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#7b7468]">
              {mode === 'login'
                ? 'Use a demo account or your own credentials to submit and validate reports.'
                : 'Create a bounty hunter or organization account directly from the frontend so the full workflow is testable.'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-[#f6f2ea]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="mb-6 flex gap-3 rounded-full border border-[#ebe4d8] bg-[#fbf8f2] p-1">
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
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${mode === item.id ? 'bg-[#171717] text-white' : 'text-[#5f5a51] hover:bg-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === 'login' && (
          <div className="mb-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyDemoCredentials('BOUNTY_HUNTER')} className="rounded-full border border-[#d9d1c4] px-3 py-2 text-xs font-medium text-[#171717] transition hover:border-[#171717]">
              Hunter demo
            </button>
            <button type="button" onClick={() => applyDemoCredentials('ORGANIZATION')} className="rounded-full border border-[#d9d1c4] px-3 py-2 text-xs font-medium text-[#171717] transition hover:border-[#171717]">
              Organization demo
            </button>
            <button type="button" onClick={() => applyDemoCredentials('ADMIN')} className="rounded-full border border-[#d9d1c4] px-3 py-2 text-xs font-medium text-[#171717] transition hover:border-[#171717]">
              Admin demo
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468]">Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm transition focus:border-[#171717] focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468]">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm transition focus:border-[#171717] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm transition focus:border-[#171717] focus:outline-none"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468]">Role</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm transition focus:border-[#171717] focus:outline-none"
                >
                  <option value="BOUNTY_HUNTER">Bounty hunter</option>
                  <option value="ORGANIZATION">Organization validator</option>
                </select>
              </div>

              {role === 'ORGANIZATION' && (
                <div>
                  <label className="mb-1.5 ml-1 block text-[11px] font-semibold uppercase tracking-wider text-[#7b7468]">Organization name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm transition focus:border-[#171717] focus:outline-none"
                    required
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button variant="primary" size="md" className="w-full py-4 text-base" type="submit" disabled={loading}>
              {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : mode === 'login' ? 'Continue' : 'Create account'}
            </Button>
          </div>
        </form>

        <div className="mt-8 border-t border-[#ebe4d8] pt-6 text-center">
          <p className="text-xs text-[#7b7468]">
            {mode === 'login'
              ? 'Need a new role? Switch to Register and create a bounty hunter or organization validator account.'
              : 'Already have an account? Switch back to Log in and use one of the demo roles.'}
          </p>
        </div>
      </div>
    </div>
  )
}
