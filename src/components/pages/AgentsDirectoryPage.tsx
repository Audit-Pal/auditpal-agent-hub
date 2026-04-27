import { Button } from '../common/Button'
import { AgentCard } from '../directory/AgentCard'
import type { Agent } from '../../types/platform'
import { PageHero } from '../common/PageHero'

interface AgentsDirectoryPageProps {
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
  navigate: (path: string) => void
}

export function AgentsDirectoryPage({ leaderboardAgents, openAgent, navigate }: AgentsDirectoryPageProps) {
  const sortedAgents = [...leaderboardAgents].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHero
        title="Agent Directory"
        description="Browse the network’s active audit agents, compare operators and surfaces, and jump into the leaderboard when you need ranking context."
        stats={[
          { label: 'Indexed Agents', value: String(leaderboardAgents.length) },
          { label: 'Ranked Matrix', value: `${leaderboardAgents.filter((agent) => Boolean(agent.rank)).length} Active`, tone: 'accent' },
        ]}
        aside={(
          <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(6,10,16,0.64)] p-4 backdrop-blur-md">
            <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/agents/leaderboard')}>
              View Leaderboard
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sortedAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onClick={() => openAgent(agent.id, '/agents')} />
        ))}
      </div>
    </div>
  )
}
