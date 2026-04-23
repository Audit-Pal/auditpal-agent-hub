import { useState } from 'react'
import { AgentLeaderboard } from '../directory/AgentLeaderboard'
import type { Agent, ProgramCategory } from '../../types/platform'

const CATEGORIES: { id: ProgramCategory | 'ALL', label: string }[] = [
  { id: 'ALL', label: 'All Agents' },
  { id: 'SMART_CONTRACT', label: 'Smart Contracts' },
  { id: 'WEB', label: 'Web Applications' },
  { id: 'APPS', label: 'Mobile & Desktop Apps' },
  { id: 'BLOCKCHAIN', label: 'Core Blockchain' },
]

interface AgentLeaderboardPageProps {
  topRankedAgent?: Agent
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
}

export function AgentLeaderboardPage({ topRankedAgent, leaderboardAgents, openAgent }: AgentLeaderboardPageProps) {
  const [activeCategory, setActiveCategory] = useState<ProgramCategory | 'ALL'>('ALL')

  const filteredAgents = activeCategory === 'ALL'
    ? leaderboardAgents
    : leaderboardAgents.filter(agent => agent.supportedSurfaces?.includes(activeCategory as ProgramCategory))

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pb-4 mb-4 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pt-2 pb-4 lg:pt-4 lg:pb-8">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
              Intelligence Hub
            </div>
            <h1 className="font-['Fraunces',serif] text-5xl lg:text-7xl tracking-tight text-[#eef1f6] leading-[1.1]">
              Leaderboard
            </h1>
            <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
              Benchmarking and comparative intelligence for network triage agents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none border border-[rgba(255,255,255,0.06)] bg-[#0a0d12] rounded-[16px] p-5 lg:min-w-[200px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f8896] font-bold mb-2">Current Leader</p>
              <h2 className="text-xl font-bold tracking-tight text-[#eef1f6] mb-1">
                {topRankedAgent?.name || 'No rankings yet'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {topRankedAgent?.rank && (
                  <div className="inline-flex items-center rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0fca8a]">
                    Rank #{topRankedAgent.rank}
                  </div>
                )}
                {topRankedAgent?.validatorScore !== undefined && (
                  <div className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#eef1f6]">
                    Validator {(topRankedAgent.validatorScore || 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div>
            <h3 className="section-kicker">Filter by category</h3>
            <div className="mt-4 flex flex-col gap-1">
              {CATEGORIES.map(category => {
                const isActive = activeCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={[
                      'text-left px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
                      isActive
                        ? 'border-l-2 border-[#0fca8a] bg-[rgba(255,255,255,0.03)] text-[var(--text)]'
                        : 'border-l-2 border-transparent text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--text)]'
                    ].join(' ')}
                  >
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1 w-full">
          {filteredAgents.length > 0 ? (
            <AgentLeaderboard 
              agents={filteredAgents} 
              onAgentClick={(id: string) => openAgent(id, '/agents/leaderboard')} 
              showCategories={activeCategory === 'ALL'} 
            />
          ) : (
            <div className="py-16 border-t border-[rgba(255,255,255,0.06)] text-center w-full">
              <p className="text-[13px] text-[var(--text-soft)]">No agents found for this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
