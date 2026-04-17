import type { SeverityReward, Severity } from '../../types/platform'
import { formatEnum, formatUsd } from '../../utils/formatters'

interface RewardMatrixProps {
  matrix: readonly SeverityReward[]
}

const severityColors: Record<Severity, string> = {
  CRITICAL: 'text-[var(--critical-text)]',
  HIGH: 'text-[var(--warning-text)]',
  MEDIUM: 'text-[#ffd487]',
  LOW: 'text-[var(--success-text)]',
}

const severityBgs: Record<Severity, string> = {
  CRITICAL: 'bg-[rgba(255,102,102,0.1)]',
  HIGH: 'bg-[rgba(255,175,82,0.1)]',
  MEDIUM: 'bg-[rgba(255,211,125,0.1)]',
  LOW: 'bg-[rgba(72,214,156,0.1)]',
}

export function RewardMatrix({ matrix }: RewardMatrixProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-xl">
          <p className="section-kicker !tracking-[0.4em] mb-4">REWARD MATRIX</p>
          <h3 className="hero-title !text-3xl lg:!text-4xl">Severity bands and payout expectations.</h3>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {matrix.map((reward) => (
          <article
            key={reward.severity}
            className={`group relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-6 xl:p-8 transition-all hover:bg-[rgba(255,255,255,0.02)] ${severityBgs[reward.severity]}`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <div className="h-10 w-10 rounded-full border border-[var(--border)] flex items-center justify-center text-[10px] font-black group-hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                {reward.severity[0]}
              </div>
            </div>

            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${severityColors[reward.severity]}`}>
              {formatEnum(reward.severity)}
            </p>
            <p className="hero-title !text-3xl xl:!text-5xl group-hover:scale-105 transition-transform origin-left">{formatUsd(reward.maxRewardUsd)}</p>
            
            <div className="mt-8 space-y-4 pt-8 border-t border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Triage SLA</span>
                <span className="text-sm font-bold text-[var(--text-soft)]">{reward.triageSla}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Payout</span>
                <span className="text-sm font-bold text-[var(--text-soft)]">{reward.payoutWindow}</span>
              </div>
            </div>
            
            <div className="mt-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Vulnerability Intel</p>
              <div className="space-y-3">
                {reward.examples.slice(0, 3).map((example) => (
                  <div key={example} className="flex gap-3 items-start group/example">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--border)] mt-1.5 group-hover/example:bg-[var(--accent)] transition-colors" />
                    <p className="text-sm leading-relaxed text-[var(--text-soft)] italic opacity-70 group-hover/example:opacity-100">{example}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
