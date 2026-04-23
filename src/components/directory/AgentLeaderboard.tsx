import { memo } from 'react'
import type { Agent } from '../../types/platform'
import { Badge } from '../common/Badge'

interface AgentLeaderboardProps {
  agents: Agent[]
  onAgentClick: (id: string) => void
  showCategories?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  SMART_CONTRACT: 'Smart Contracts',
  WEB: 'Web Applications',
  APPS: 'Mobile & Desktop',
  BLOCKCHAIN: 'Core Blockchain',
}

function AgentLeaderboardBase({ agents, onAgentClick, showCategories = true }: AgentLeaderboardProps) {
  return (
    <div className="space-y-4">
      {agents.map((agent) => (
        <article
          key={agent.id}
          onClick={() => onAgentClick(agent.id)}
          className="group relative cursor-pointer border-b border-[rgba(255,255,255,0.04)] last:border-b-0 py-6 transition duration-300 hover:bg-[rgba(255,255,255,0.015)] px-4"
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
                  {showCategories && agent.supportedSurfaces?.map((cat) => {
                    const label = CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ')
                    return (
                      <Badge key={cat} tone="default">{label}</Badge>
                    )
                  })}
                </div>
                <h3 className="mt-4 font-serif text-3xl leading-tight text-[var(--text)]">{agent.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{agent.headline}</p>
              </div>
            </div>

            <div className="min-w-[180px] p-2 text-left md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f8896]">Operator</p>
              <p className="mt-1 text-sm font-semibold text-[#eef1f6]">{agent.minerName || 'Anonymous Miner'}</p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f8896]">Total Score</p>
              <p className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-[#12f4a6]">{agent.score?.toFixed(1) || '0.0'}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export const AgentLeaderboard = memo(AgentLeaderboardBase)
