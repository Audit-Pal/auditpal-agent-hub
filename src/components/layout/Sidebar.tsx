type SidebarView = 'programs' | 'agents' | 'agent_leaderboard' | 'program_detail' | 'agent_detail'
type SidebarDestination = 'programs' | 'agents' | 'agents/leaderboard'

interface SidebarProps {
    view: SidebarView
    onNavigate: (to: SidebarDestination) => void
}

export function Sidebar({ view, onNavigate }: SidebarProps) {
    const isProgramsActive = view === 'programs' || view === 'program_detail'
    const isAgentsActive = view === 'agents'
    const isLeaderboardActive = view === 'agent_leaderboard'

    const navItemClass = (isActive: boolean) => `text-left px-4 py-3 rounded-2xl transition-all border ${isActive
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.08)]'
        : 'text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-900/70 hover:border-zinc-800'
        }`

    return (
        <nav className="w-72 border-r border-zinc-900 bg-zinc-950/95 backdrop-blur flex flex-col p-6">
            <div
                className="flex items-center space-x-3 font-extrabold text-xl mb-12 cursor-pointer group"
                onClick={() => onNavigate('programs')}
            >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center text-black shadow-lg shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                    A
                </div>
                <span className="tracking-tight text-white">AuditPal</span>
            </div>

            <div className="mb-4 px-4">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.28em]">Programs</p>
            </div>

            <div className="flex flex-col space-y-2">
                <button
                    onClick={() => onNavigate('programs')}
                    className={navItemClass(isProgramsActive)}
                >
                    <span className="block text-sm font-semibold">Programs</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
                        Bounty directory
                    </span>
                </button>
            </div>

            <div className="mt-8 mb-4 px-4">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.28em]">Agents</p>
            </div>

            <div className="flex flex-col space-y-2">
                <button
                    onClick={() => onNavigate('agents')}
                    className={navItemClass(isAgentsActive)}
                >
                    <span className="block text-sm font-semibold">AI Agents</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
                        Validator set
                    </span>
                </button>
                <button
                    onClick={() => onNavigate('agents/leaderboard')}
                    className={navItemClass(isLeaderboardActive)}
                >
                    <span className="block text-sm font-semibold">Agent Leaderboard</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
                        Benchmarks
                    </span>
                </button>
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-900">
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <div className="w-10 h-10 bg-zinc-800 rounded-full border border-zinc-700 group-hover:border-emerald-500/50 transition-colors" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white mb-0.5">Researcher_0x</p>
                        <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Rep: 2,450</p>
                    </div>
                </div>
            </div>
        </nav>
    )
}
