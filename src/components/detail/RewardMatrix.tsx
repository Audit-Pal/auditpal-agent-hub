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
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Reward matrix</p>
          <h3 className="mt-3 font-serif text-4xl text-[var(--text)]">Severity bands and payout expectations.</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {matrix.map((reward) => (
          <article
            key={reward.severity}
            className={`rounded-[28px] border border-[var(--border)] p-5 ${severityBgs[reward.severity]}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${severityColors[reward.severity]}`}>
              {formatEnum(reward.severity)}
            </p>
            <p className="mt-4 text-3xl font-semibold text-[var(--text)]">{formatUsd(reward.maxRewardUsd)}</p>
            <div className="mt-5 space-y-3 text-sm text-[var(--text-soft)]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Triage SLA</span>
                <span>{reward.triageSla}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Payout window</span>
                <span>{reward.payoutWindow}</span>
              </div>
            </div>
            <div className="mt-5 border-t border-white/8 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Examples</p>
              <div className="mt-3 space-y-2">
                {reward.examples.slice(0, 2).map((example) => (
                  <p key={example} className="text-sm leading-7 text-[var(--text-soft)]">
                    {example}
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
