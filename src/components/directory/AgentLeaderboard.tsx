import type { Agent } from '../../types/platform'
import { Badge } from '../common/Badge'

interface AgentLeaderboardProps {
  agents: Agent[]
  onAgentClick: (id: string) => void
}

export function AgentLeaderboard({ agents, onAgentClick }: AgentLeaderboardProps) {
  const sortedAgents = [...agents].sort((a, b) => (a.rank || 999) - (b.rank || 999))

  return (
    <div className="space-y-4">
      {sortedAgents.map((agent) => (
        <article
          key={agent.id}
          onClick={() => onAgentClick(agent.id)}
          className="cursor-pointer rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_48px_rgba(30,24,16,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#171717]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] text-lg font-semibold text-[#171717]">
                {agent.logoMark}
              </div>
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={agent.rank === 1 ? 'new' : 'accent'}>Rank #{agent.rank || '-'}</Badge>
                  <Badge tone="soft">Validator {(agent.validatorScore || 0).toFixed(2)}</Badge>
                </div>
                <h3 className="mt-4 font-serif text-3xl leading-tight text-[#171717]">{agent.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[#4b463f]">{agent.headline}</p>
              </div>
            </div>

            <div className="min-w-[220px] rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Operator</p>
              <p className="mt-2 text-sm text-[#171717]">{agent.minerName || 'Anonymous Miner'}</p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Score</p>
              <p className="mt-2 text-2xl font-semibold text-[#171717]">{agent.score?.toFixed(1) || '0.0'}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
