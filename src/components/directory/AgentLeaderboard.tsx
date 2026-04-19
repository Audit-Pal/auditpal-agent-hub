import { memo } from 'react'
import type { Agent } from '../../types/platform'
import { Badge } from '../common/Badge'

interface AgentLeaderboardProps {
  agents: Agent[]
  onAgentClick: (id: string) => void
}

function AgentLeaderboardBase({ agents, onAgentClick }: AgentLeaderboardProps) {
  return (
    <div className="space-y-4">
      {agents.map((agent) => (
        <article
          key={agent.id}
          onClick={() => onAgentClick(agent.id)}
          className="surface-card-strong content-auto contain-paint cursor-pointer rounded-[32px] p-6 transition duration-200 hover:-translate-y-0.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#0f766e,#0b5f61)] text-lg font-extrabold text-white shadow-[0_18px_34px_rgba(15,118,110,0.24)]">
                {agent.logoMark}
              </div>
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={agent.rank === 1 ? 'new' : 'accent'}>Rank #{agent.rank || '-'}</Badge>
                  <Badge tone="soft">Validator {(agent.validatorScore || 0).toFixed(2)}</Badge>
                </div>
                <h3 className="mt-4 font-serif text-3xl leading-tight text-[var(--text)]">{agent.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{agent.headline}</p>
              </div>
            </div>

            <div className="surface-card-muted min-w-[220px] rounded-[24px] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Operator</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text)]">{agent.minerName || 'Anonymous Miner'}</p>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Score</p>
              <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{agent.score?.toFixed(1) || '0.0'}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export const AgentLeaderboard = memo(AgentLeaderboardBase)
