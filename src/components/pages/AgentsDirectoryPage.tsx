import { Button } from '../common/Button'
import { AgentCard } from '../directory/AgentCard'
import type { Agent } from '../../types/platform'

interface AgentsDirectoryPageProps {
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
  navigate: (path: string) => void
}

export function AgentsDirectoryPage({ leaderboardAgents, openAgent, navigate }: AgentsDirectoryPageProps) {
  const sortedAgents = [...leaderboardAgents].sort((a, b) => a.name.localeCompare(b.name))

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
              Agent Directory
            </h1>
            <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
              Explore triage and benchmarking agents active on the network. Monitor capabilities, score ranking, and evaluate performance analytics on-chain.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none border border-[rgba(255,255,255,0.06)] bg-[#0a0d12] rounded-[16px] p-5 lg:min-w-[160px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f8896] font-bold mb-1">Indexed Agents</p>
              <p className="text-2xl font-bold tracking-tight text-[#eef1f6]">{leaderboardAgents.length}</p>
            </div>
            <div className="flex-1 lg:flex-none border border-[rgba(255,255,255,0.06)] bg-[#0a0d12] rounded-[16px] p-5 lg:min-w-[140px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f8896] font-bold mb-1">Ranked Matrix</p>
              <p className="text-2xl font-bold tracking-tight text-[#12f4a6]">{leaderboardAgents.filter((agent) => Boolean(agent.rank)).length} Active</p>
            </div>
            <div className="w-full sm:w-auto sm:self-center ml-0 sm:ml-2">
              <Button variant="primary" size="lg" className="w-full sm:w-auto mt-2 sm:mt-0" onClick={() => navigate('/agents/leaderboard')}>
                View Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sortedAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onClick={() => openAgent(agent.id, '/agents')} />
        ))}
      </div>
    </div>
  )
}
