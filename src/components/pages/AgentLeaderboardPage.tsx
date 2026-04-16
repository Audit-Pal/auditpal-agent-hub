import { Badge } from '../common/Badge'
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
      <section className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-kicker">Leaderboard</p>
            <h1 className="section-title mt-4 max-w-4xl">
              Ranked agent performance.
            </h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              Benchmarking and comparative intelligence.
            </p>
          </div>

          <aside className="surface-card-muted rounded-[30px] p-6">
            <p className="section-kicker">Current leader</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">
              {topRankedAgent?.name || 'No rankings yet'}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
              {topRankedAgent?.headline || 'Top agent details will appear here when ranking data is available.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {topRankedAgent?.rank && <Badge tone="new">Rank #{topRankedAgent.rank}</Badge>}
              {topRankedAgent?.validatorScore !== undefined && (
                <Badge tone="accent">Validator {(topRankedAgent.validatorScore || 0).toFixed(2)}</Badge>
              )}
            </div>
          </aside>
        </div>
      </section>

      <AgentLeaderboard agents={leaderboardAgents} onAgentClick={(id: string) => openAgent(id, '/agents/leaderboard')} />
    </div>
  )
}
