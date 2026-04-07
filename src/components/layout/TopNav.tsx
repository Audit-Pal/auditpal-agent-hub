import { Link } from 'react-router-dom'
import { Button } from '../common/Button'
import { useAuth } from '../../contexts/AuthContext'

const navItems: { label: string; path: string; active: (pathname: string) => boolean }[] = [
  {
    label: 'Home',
    path: '/',
    active: (path) => path === '/',
  },
  {
    label: 'Programs',
    path: '/programs',
    active: (path) => path.startsWith('/programs') || path.startsWith('/program/'),
  },
  {
    label: 'Reports',
    path: '/reports',
    active: (path) => path === '/reports',
  },
  {
    label: 'AI Ops',
    path: '/agents',
    active: (path) => path.startsWith('/agent'),
  },
]

interface TopNavProps {
  pathname: string
  reportCount: number
  onSubmit: () => void
  onLogin: () => void
}

export function TopNav({ pathname, reportCount, onSubmit, onLogin }: TopNavProps) {
  const { user, logout } = useAuth()

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
              <div className="flex items-center gap-3 mr-2 px-3 py-1.5 rounded-full bg-[#f6f2ea] border border-[#ebe4d8]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] text-[10px] font-bold text-white uppercase">
                  {user.name.substring(0, 2)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-[#171717] leading-none">{user.name}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[#7b7468] mt-0.5">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 p-1 text-[#7b7468] hover:text-[#171717] transition"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="rounded-full border border-[#d9d1c4] px-4 py-2 text-sm text-[#5f5a51] transition hover:border-[#171717] hover:text-[#171717]"
              >
                Log in
              </button>
            )}

            <Button variant="primary" size="md" onClick={onSubmit}>
              Submit report
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
