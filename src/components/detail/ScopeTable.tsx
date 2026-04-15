import type { ScopeTarget, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { getScopeTargetContextChips, getScopeTargetReference } from '../../utils/scopeTargets'
import { formatEnum } from '../../utils/formatters'

interface ScopeTableProps {
  targets: readonly ScopeTarget[]
}

const severityTone: Record<Severity, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export function ScopeTable({ targets }: ScopeTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(7,14,20,0.82)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse bg-transparent">
          <thead className="bg-[rgba(13,26,37,0.9)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Target</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Coverage</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Reference</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Severity cap</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b border-[rgba(116,145,153,0.12)] last:border-b-0">
                <td className="px-4 py-5">
                  <p className="font-medium text-[var(--text)]">{target.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{target.note}</p>
                </td>
                <td className="px-4 py-5">
                  <div className="flex flex-wrap gap-2">
                    {getScopeTargetContextChips(target).map((chip) => (
                      <Badge key={`${target.id}-${chip}`} tone="soft">
                        {formatEnum(chip)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-5">
                  {target.referenceUrl ? (
                    <a
                      href={target.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-[320px] rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm text-[var(--accent-strong)] transition hover:border-[rgba(56,217,178,0.24)] hover:text-[var(--text)]"
                    >
                      <span className="truncate">{getScopeTargetReference(target)}</span>
                    </a>
                  ) : (
                    <span className="inline-flex max-w-[320px] rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm text-[var(--text-soft)]">
                      <span className="truncate">{getScopeTargetReference(target)}</span>
                    </span>
                  )}
                  <p className="mt-2 text-sm text-[var(--text-soft)]">{target.location}</p>
                </td>
                <td className="px-4 py-5">
                  <Badge tone={severityTone[target.severity]}>{formatEnum(target.severity)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
