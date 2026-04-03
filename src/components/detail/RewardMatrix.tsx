import type { SeverityReward, Severity } from '../../types/platform'

interface RewardMatrixProps {
    matrix: readonly SeverityReward[]
}

const severityColors: Record<Severity, string> = {
  Critical: 'text-[#9f3d28]',
  High: 'text-[#9d5a17]',
  Medium: 'text-[#8a6700]',
  Low: 'text-[#315e50]',
}

const severityBgs: Record<Severity, string> = {
  Critical: 'bg-[#fdf0ed]',
  High: 'bg-[#fff5ea]',
  Medium: 'bg-[#fff9e7]',
  Low: 'bg-[#f1f7f2]',
}

export function RewardMatrix({ matrix }: RewardMatrixProps) {
  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Reward matrix</p>
          <h3 className="mt-3 font-serif text-4xl text-[#171717]">Severity bands and payout expectations.</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {matrix.map((reward) => (
          <article
            key={reward.severity}
            className={`rounded-[28px] border border-[#e6dfd3] p-5 ${severityBgs[reward.severity]}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${severityColors[reward.severity]}`}>
              {reward.severity}
            </p>
            <p className="mt-4 text-3xl font-semibold text-[#171717]">{formatUsd(reward.maxRewardUsd)}</p>
            <div className="mt-5 space-y-3 text-sm text-[#4b463f]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#7b7468]">Triage SLA</span>
                <span>{reward.triageSla}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#7b7468]">Payout window</span>
                <span>{reward.payoutWindow}</span>
              </div>
            </div>
            <div className="mt-5 border-t border-white/70 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Examples</p>
              <div className="mt-3 space-y-2">
                {reward.examples.slice(0, 2).map((example) => (
                  <p key={example} className="text-sm leading-7 text-[#4b463f]">
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
