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
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-xl">
          <p className="section-kicker !tracking-[0.4em] mb-4">INTELLIGENCE QUEUE</p>
          <h3 className="hero-title !text-3xl lg:!text-4xl">Representative findings in high-fidelity triage.</h3>
        </div>
      </div>

      <div className="grid gap-6">
        {queue.map((report) => (
          <article key={report.id} className="group relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-8 transition-all hover:bg-[rgba(255,255,255,0.02)]">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <span className="text-[10px] font-black font-mono tracking-widest text-[var(--accent)] group-hover:opacity-100 transition-opacity">
                SIGNAL // {report.id}
              </span>
            </div>
            
            <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={severityTone[report.severity]} className="!shadow-none">{formatEnum(report.severity)}</Badge>
                  <Badge tone="accent" className="!shadow-none">{formatEnum(report.status)}</Badge>
                </div>
                <h4 className="hero-title !text-2xl lg:!text-3xl group-hover:text-[var(--accent)] transition-colors">{report.title}</h4>
                <p className="text-lg leading-relaxed text-[var(--text-soft)] italic border-l-2 border-[var(--border)] pl-6">{report.note}</p>
                
                <div className="grid gap-4 sm:grid-cols-3 pt-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[rgba(3,6,8,0.4)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Source</p>
                    <p className="text-xs font-mono text-[var(--text)]">{report.source}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[rgba(3,6,8,0.4)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Reported</p>
                    <p className="text-xs font-mono text-[var(--text)]">{report.submittedAt}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[rgba(3,6,8,0.4)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Validator</p>
                    <p className="text-xs font-mono text-[var(--text)]">{report.decisionOwner || 'System AI'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-[28px] border border-[var(--border)] bg-[rgba(0,212,168,0.03)] p-8 text-center group-hover:bg-[rgba(0,212,168,0.06)] transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)] mb-2">Estimated Bounty</p>
                <p className="text-4xl font-extrabold text-[var(--text)] tracking-tighter">{formatUsd(report.rewardEstimateUsd || 0)}</p>
                <div className="h-px w-12 bg-[var(--accent)] mx-auto my-6 opacity-30" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Attack Surface</p>
                <p className="text-xs font-mono text-[var(--text-soft)] truncate">{report.route}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
