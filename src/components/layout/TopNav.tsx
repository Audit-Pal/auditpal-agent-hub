import { Button } from '../common/Button'

type TopNavView = 'home' | 'programs' | 'reports' | 'agents' | 'agent_leaderboard' | 'program_detail' | 'agent_detail'
type TopNavDestination = 'home' | 'programs' | 'reports' | 'agents' | 'agents/leaderboard'

const navItems: { label: string; destination: TopNavDestination; active: (view: TopNavView) => boolean }[] = [
  {
    label: 'Home',
    destination: 'home',
    active: (view) => view === 'home',
  },
  {
    label: 'Programs',
    destination: 'programs',
    active: (view) => view === 'programs' || view === 'program_detail',
  },
  {
    label: 'Reports',
    destination: 'reports',
    active: (view) => view === 'reports',
  },
  {
    label: 'AI Ops',
    destination: 'agents',
    active: (view) => view === 'agents' || view === 'agent_detail' || view === 'agent_leaderboard',
  },
]

interface TopNavProps {
  view: TopNavView
  reportCount: number
  onNavigate: (to: TopNavDestination) => void
  onSubmit: () => void
}

export function TopNav({ view, reportCount, onNavigate, onSubmit }: TopNavProps) {
  return (
    <header className="sticky top-4 z-40">
      <div className="rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.88)] px-5 py-4 shadow-[0_24px_70px_rgba(30,24,16,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 rounded-full px-2 py-1 text-left transition hover:bg-[#f6f2ea]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#171717] bg-[#171717] text-lg font-semibold text-white">
              A
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#171717]">AuditPal</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7b7468]">Security research workspace</p>
            </div>
          </button>

          <nav className="flex flex-1 flex-wrap items-center justify-center gap-2">
            {navItems.map((item) => {
              const isActive = item.active(view)

              return (
                <button
                  key={item.destination}
                  onClick={() => onNavigate(item.destination)}
                  className={`rounded-full px-4 py-2.5 text-sm transition ${isActive
                    ? 'bg-[#171717] text-white'
                    : 'text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]'
                    }`}
                >
                  {item.label}
                  {item.destination === 'reports' && reportCount > 0 && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white/15 text-white' : 'bg-[#ebe4d8] text-[#171717]'}`}>
                      {reportCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('agents/leaderboard')}
              className="hidden rounded-full border border-[#d9d1c4] px-4 py-2 text-sm text-[#5f5a51] transition hover:border-[#171717] hover:text-[#171717] lg:inline-flex"
            >
              Validator leaderboard
            </button>
            <Button variant="primary" size="md" onClick={onSubmit}>
              Submit report
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
