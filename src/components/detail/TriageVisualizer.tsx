import type { TriageStage } from '../../types/platform'
import { formatEnum } from '../../utils/formatters'
import { Badge } from '../common/Badge'

interface TriageVisualizerProps {
  stages: readonly TriageStage[]
}

export function TriageVisualizer({ stages }: TriageVisualizerProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-xl">
          <p className="section-kicker !tracking-[0.4em] mb-4">TRIAGE PIPELINE</p>
          <h3 className="hero-title !text-3xl lg:!text-4xl">Movement of findings from intake to decision.</h3>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-[var(--text-muted)] italic">
          Operational protocol ensures consistent validation and timely payouts across all active bounty campaigns.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {stages.map((stage, index) => (
          <article key={stage.title} className="group relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-6 transition-all hover:bg-[rgba(255,255,255,0.01)]">
            <div className="flex items-start justify-between gap-4 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm font-black text-[var(--text-muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-colors">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Badge tone={stage.automation === 'AUTOMATED' ? 'accent' : 'soft'} className="!shadow-none !lowercase !tracking-normal">
                {formatEnum(stage.automation)}
              </Badge>
            </div>
            
            <h4 className="text-xl font-bold text-[var(--text)] mb-1 group-hover:text-[var(--accent)] transition-colors">{stage.title}</h4>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">{stage.owner}</p>
            
            <div className="rounded-2xl border border-[rgba(255,255,255,0.03)] bg-[rgba(3,6,8,0.4)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent)] opacity-40 mb-2">Protocol Trigger</p>
              <p className="text-xs leading-relaxed text-[var(--text-soft)] italic">{stage.trigger}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
