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
    <div className="flex flex-col w-full">
      {agents.map((agent, idx) => (
        <div key={agent.id}>
          {idx > 0 && <div className="h-px bg-[rgba(255,255,255,0.02)] my-4 mx-8" />}
          <article
            onClick={() => onAgentClick(agent.id)}
            className="group relative cursor-pointer border border-[rgba(255,255,255,0.03)] bg-[rgba(13,17,24,0.3)] backdrop-blur-md rounded-[24px] p-5 transition duration-300 hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-6 pb-2">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(15,202,138,0.2)] bg-[linear-gradient(135deg,rgba(15,202,138,0.2),rgba(15,202,138,0.05))] text-lg font-extrabold text-[#0fca8a]">
                  {agent.logoMark}
                </div>
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge tone={agent.rank === 1 ? 'new' : 'accent'}>Rank #{agent.rank || '-'}</Badge>
                    <Badge tone="soft">Validator {(agent.validatorScore || 0).toFixed(2)}</Badge>
                    {showCategories && agent.supportedSurfaces?.map((cat) => {
                      const label = CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ')
                      return (
                        <Badge key={cat} tone="default">{label}</Badge>
                      )
                    })}
                  </div>
                  <h3 className="mt-4 font-['Fraunces',serif] text-3xl leading-tight text-[var(--text)] transition group-hover:text-[#0fca8a]">{agent.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{agent.headline}</p>
                </div>
              </div>

              <div className="min-w-[180px] p-2 text-left md:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f8896]">Operator</p>
                <p className="mt-1 text-sm font-semibold text-[#eef1f6]">{agent.minerName || 'Anonymous Miner'}</p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f8896]">Total Score</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#12f4a6]">{agent.score?.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  )
}

export const AgentLeaderboard = memo(AgentLeaderboardBase)
