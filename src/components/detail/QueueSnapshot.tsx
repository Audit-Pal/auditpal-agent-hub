import type { ReportSnapshot, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'

interface QueueSnapshotProps {
    queue: readonly ReportSnapshot[]
}

const severityTone: Record<Severity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
}

export function QueueSnapshot({ queue }: QueueSnapshotProps) {
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Live queue snapshot</p>
          <h3 className="mt-3 font-serif text-4xl text-[#171717]">Representative findings already moving through triage.</h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {queue.map((report) => (
          <article key={report.id} className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="soft">{report.id}</Badge>
                  <Badge tone={severityTone[report.severity]}>{report.severity}</Badge>
                  <Badge tone="accent">{report.status}</Badge>
                </div>
                <h4 className="mt-4 text-xl font-semibold text-[#171717]">{report.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">{report.note}</p>
              </div>

              <div className="min-w-[220px] rounded-[24px] border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Estimated reward</p>
                <p className="mt-2 text-2xl font-semibold text-[#171717]">{formatUsd(report.rewardEstimateUsd)}</p>
                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Route</p>
                <p className="mt-2 text-sm text-[#171717]">{report.route}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Source</p>
                <p className="mt-2 text-sm text-[#171717]">{report.source}</p>
              </div>
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Submitted</p>
                <p className="mt-2 text-sm text-[#171717]">{report.submittedAt}</p>
              </div>
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Decision owner</p>
                <p className="mt-2 text-sm text-[#171717]">{report.decisionOwner}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
