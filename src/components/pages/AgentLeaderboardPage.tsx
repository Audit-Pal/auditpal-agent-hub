import { useState } from 'react'
import { AgentLeaderboard } from '../directory/AgentLeaderboard'
import type { Agent, ProgramCategory } from '../../types/platform'
import { PageHero } from '../common/PageHero'

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
      <PageHero
        title="Leaderboard"
        description="Benchmark triage agents across rank, validator confidence, and supported surfaces without losing the context of each operator."
        stats={[
          { label: 'Current Leader', value: topRankedAgent?.name || 'No rankings yet' },
          { label: 'Visible Agents', value: String(filteredAgents.length), tone: 'accent' },
        ]}
      />

      <div className="flex flex-col lg:flex-row items-start gap-8">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[rgba(9,14,20,0.32)] p-5 backdrop-blur-[16px]">
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
            <div className="w-full rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[rgba(9,18,27,0.34)] py-16 text-center backdrop-blur-[14px]">
              <p className="text-[13px] text-[var(--text-soft)]">No agents found for this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
