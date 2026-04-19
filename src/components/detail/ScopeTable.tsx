import type { ScopeTarget, Severity } from '../../types/platform'
import { getScopeTargetContextChips, getScopeTargetReference } from '../../utils/scopeTargets'
import { formatEnum } from '../../utils/formatters'

interface ScopeTableProps {
  targets: readonly ScopeTarget[]
}

const severityDot: Record<Severity, string> = {
  CRITICAL: 'bg-[var(--critical-text)]',
  HIGH: 'bg-[var(--warning-text)]',
  MEDIUM: 'bg-[#ffd487]',
  LOW: 'bg-[var(--success-text)]',
}

export function ScopeTable({ targets }: ScopeTableProps) {
  if (targets.length === 0) {
    return <p className="text-sm leading-7 text-[var(--text-soft)]">No in-scope targets have been published yet.</p>
  }

  return (
    <div className="content-auto border-y border-[var(--border)]">
      <div className="hidden gap-6 border-b border-[var(--border)] py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.95fr)_110px]">
        <div className="pr-4">Target</div>
        <div className="pr-4">Coverage</div>
        <div className="pr-4">Reference</div>
        <div className="text-right">Severity</div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {targets.map((target) => (
          <article
            key={target.id}
            className="grid gap-4 py-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.95fr)_110px] md:items-start"
          >
            <div className="pr-4">
              <p className="text-base font-semibold text-[var(--text)]">{target.label}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{target.note}</p>
            </div>

            <div className="pr-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] md:hidden">Coverage</p>
              <p className="mt-1 text-sm text-[var(--text)] md:mt-0">{target.location}</p>
              {getScopeTargetContextChips(target).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {getScopeTargetContextChips(target).map((chip) => (
                    <span key={`${target.id}-${chip}`} className="border border-[var(--border)] px-2 py-1">
                      {formatEnum(chip)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="pr-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] md:hidden">Reference</p>
              {target.referenceUrl ? (
                <a
                  href={target.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm text-[var(--accent-strong)] transition hover:text-[var(--text)] md:mt-0"
                >
                  {getScopeTargetReference(target)}
                </a>
              ) : (
                <p className="mt-1 break-all text-sm text-[var(--text)] md:mt-0">{getScopeTargetReference(target)}</p>
              )}
              <p className="mt-2 text-xs text-[var(--text-soft)]">{target.reviewStatus}</p>
            </div>

            <div className="flex items-center gap-2 md:justify-end">
              <span className={`h-2.5 w-2.5 rounded-full ${severityDot[target.severity]}`} />
              <span className="text-sm font-medium text-[var(--text)]">{formatEnum(target.severity)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
