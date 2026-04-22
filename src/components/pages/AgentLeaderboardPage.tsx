import { AgentLeaderboard } from '../directory/AgentLeaderboard'
import type { Agent } from '../../types/platform'

interface AgentLeaderboardPageProps {
  topRankedAgent?: Agent
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
}

export function AgentLeaderboardPage({ topRankedAgent, leaderboardAgents, openAgent }: AgentLeaderboardPageProps) {
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

      <AgentLeaderboard agents={leaderboardAgents} onAgentClick={(id: string) => openAgent(id, '/agents/leaderboard')} />
    </div>
  )
}
