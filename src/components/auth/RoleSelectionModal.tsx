import { motion } from 'framer-motion'

interface RoleSelectionModalProps {
  isOpen: boolean
  onSelectRole: (role: 'agent' | 'organization' | 'guest') => void
  onClose: () => void
}

export function RoleSelectionModal({ isOpen, onSelectRole, onClose }: RoleSelectionModalProps) {
  if (!isOpen) return null

  const roles = [
    {
      id: 'agent' as const,
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
        </svg>
      ),
      title: 'Security Researcher',
      subtitle: 'Bounty Hunter / Agent',
      description: 'Browse bounty programs, submit findings, track triage status, and earn rewards for valid vulnerabilities.',
      features: ['Access all bounty programs', 'Submit security findings', 'Track application status', 'Earn reputation & rewards'],
      accent: 'var(--accent)',
    },
    {
      id: 'organization' as const,
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
        </svg>
      ),
      title: 'Organization',
      subtitle: 'Program Owner',
      description: 'Launch bug bounty programs, manage scope, configure rewards, and review incoming security submissions.',
      features: ['Create bounty programs', 'Configure reward tiers', 'Manage applications', 'Assign reviewers'],
      accent: '#8b5cf6',
    },
    {
      id: 'guest' as const,
      icon: (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
        </svg>
      ),
      title: 'Browse as Guest',
      subtitle: 'No account needed',
      description: 'Explore the platform, view active bounty programs, check agent leaderboards, and learn about the ecosystem.',
      features: ['View bounty programs', 'Explore agent directory', 'Read documentation', 'No login required'],
      accent: '#64748b',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,38,0.5)] p-4 backdrop-blur-md animate-fade-in">
      <div className="surface-card-strong w-full max-w-6xl overflow-hidden rounded-[34px] p-8 md:p-10 animate-scale-in">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Welcome to AuditPal</p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-tight text-[var(--text)]">
              How would you like to get started?
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--text-soft)]">
              Choose your role to access the right workspace and features. You can always create additional accounts later.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[rgba(13,26,37,0.94)] hover:text-[var(--text)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className="group surface-card-muted flex flex-col rounded-[28px] p-6 text-left transition-all duration-200 hover:scale-[1.02] hover:border-[rgba(0,212,168,0.3)] hover:shadow-[0_20px_50px_rgba(0,212,168,0.12)]"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: `${role.accent}15`,
                  borderColor: `${role.accent}30`,
                  color: role.accent,
                }}
              >
                {role.icon}
              </div>

              <div className="mt-5 flex-1">
                <h3 className="text-xl font-bold tracking-[-0.02em] text-[var(--text)]">{role.title}</h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {role.subtitle}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-soft)]">{role.description}</p>

                <ul className="mt-4 space-y-2">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[12px] text-[var(--text-soft)]">
                      <span className="mt-0.5 text-[var(--accent)]">→</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <div
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold transition-all duration-300"
                  style={{
                    backgroundColor: `${role.accent}15`,
                    color: role.accent,
                  }}
                >
                  {role.id === 'guest' ? 'Continue as Guest' : 'Select & Continue'}
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="subtle-divider mt-8 pt-6 text-center">
          <p className="text-[12px] text-[var(--text-muted)]">
            All roles have access to view public bounty programs and documentation. Authentication is only required for submissions and program management.
          </p>
        </div>
      </div>
    </div>
  )
}
