import type { ReportSnapshot, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { formatEnum } from '../../utils/formatters'

interface QueueSnapshotProps {
  queue: readonly ReportSnapshot[]
}

const severityTone: Record<Severity, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export function QueueSnapshot({ queue = [] }: QueueSnapshotProps) {
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Live queue snapshot</p>
          <h3 className="mt-3 font-serif text-4xl text-[var(--text)]">Representative findings already moving through triage.</h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {queue.map((report) => (
          <article key={report.id} className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="soft">{report.id}</Badge>
                  <Badge tone={severityTone[report.severity]}>{formatEnum(report.severity)}</Badge>
                  <Badge tone="accent">{formatEnum(report.status)}</Badge>
                </div>
                <h4 className="mt-4 text-xl font-semibold text-[var(--text)]">{report.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{report.note}</p>
              </div>

              <div className="min-w-[220px] rounded-[24px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Estimated reward</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatUsd(report.rewardEstimateUsd || 0)}</p>
                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Route</p>
                <p className="mt-2 text-sm text-[var(--text)]">{report.route}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Source</p>
                <p className="mt-2 text-sm text-[var(--text)]">{report.source}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Submitted</p>
                <p className="mt-2 text-sm text-[var(--text)]">{report.submittedAt}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Decision owner</p>
                <p className="mt-2 text-sm text-[var(--text)]">{report.decisionOwner}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
