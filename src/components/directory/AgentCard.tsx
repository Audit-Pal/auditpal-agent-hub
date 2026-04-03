import type { Agent } from '../../types/platform'
import { Badge } from '../common/Badge'

interface AgentCardProps {
  agent: Agent
  onClick: () => void
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <article
      onClick={onClick}
      className="cursor-pointer rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_48px_rgba(30,24,16,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#171717]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] text-lg font-semibold text-[#171717]">
          {agent.logoMark}
        </div>
        {agent.rank && <Badge tone="accent">Rank #{agent.rank}</Badge>}
      </div>

      <div className="mt-5">
        <h3 className="font-serif text-3xl leading-tight text-[#171717]">{agent.name}</h3>
        <p className="mt-3 text-sm leading-7 text-[#4b463f]">{agent.headline}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(agent.capabilities || []).slice(0, 2).map((capability) => (
          <Badge key={capability} tone="soft">
            {capability}
          </Badge>
        ))}
      </div>

      <div className="mt-6 grid gap-3 border-t border-[#ebe4d8] pt-5 md:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Operator</p>
          <p className="mt-2 text-sm text-[#171717]">{agent.minerName || 'Anonymous'}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Score</p>
          <p className="mt-2 text-sm text-[#171717]">{agent.score?.toFixed(1) || '0.0'}</p>
        </div>
      </div>
    </article>
  )
}
