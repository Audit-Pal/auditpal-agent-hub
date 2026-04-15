import { Button } from '../common/Button'
import { MetricCard } from '../common/MetricCard'
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
      <section className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <div>
            <p className="section-kicker">Agent directory</p>
            <h1 className="section-title mt-4 max-w-4xl">
              The supporting runtime behind triage, benchmarking, and submission workflows.
            </h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              This view is now easier to scan and compare, so researchers and teams can quickly understand which agents are tuned for their
              specific surfaces.
            </p>
          </div>

          <aside className="surface-card-muted rounded-[30px] p-6">
            <p className="section-kicker">Quick snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricCard label="Indexed agents" value={leaderboardAgents.length} className="!rounded-[22px] !p-4" />
              <MetricCard label="Ranked" value={leaderboardAgents.filter((agent) => Boolean(agent.rank)).length} className="!rounded-[22px] !p-4" />
            </div>
            <Button variant="outline" size="md" className="mt-5 w-full justify-center" onClick={() => navigate('/agents/leaderboard')}>
              Open leaderboard view
            </Button>
          </aside>
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
