import type { Agent } from '../../types/platform'
import { Badge } from '../common/Badge'
import { formatEnum } from '../../utils/formatters'

interface AgentCardProps {
  agent: Agent
  onClick: () => void
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const coverageBadges = agent.supportedSurfaces?.length
    ? agent.supportedSurfaces.slice(0, 2)
    : (agent.capabilities || []).slice(0, 2)

  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer border-b border-[rgba(255,255,255,0.04)] last:border-b-0 py-6 transition duration-300 hover:bg-[rgba(255,255,255,0.015)] px-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#0f766e,#0b5f61)] text-lg font-extrabold text-white shadow-[0_18px_34px_rgba(15,118,110,0.24)]">
          {agent.logoMark}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {agent.rank && <Badge tone="accent">Rank #{agent.rank}</Badge>}
          {agent.validatorScore !== undefined && <Badge tone="soft">Validator {(agent.validatorScore || 0).toFixed(2)}</Badge>}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-serif text-3xl leading-tight text-[var(--text)]">{agent.name}</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)] line-clamp-2">{agent.headline}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {coverageBadges.map((item) => (
          <Badge key={item} tone="soft">
            {formatEnum(item)}
          </Badge>
        ))}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Operator</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">{agent.minerName || 'Anonymous'}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Quick action</p>
          <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">Open runtime details</p>
        </div>
      </div>
    </article>
  )
}
