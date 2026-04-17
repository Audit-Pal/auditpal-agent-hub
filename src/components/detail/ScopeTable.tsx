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
    <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] backdrop-blur-md shadow-[var(--shadow-lg)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse bg-transparent">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border)]">
              <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Resource Entry</th>
              <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Intel Context</th>
              <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Operational Link</th>
              <th className="px-6 py-5 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Risk Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {targets.map((target) => (
              <tr key={target.id} className="group hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                <td className="px-6 py-6">
                  <p className="text-base font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{target.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)] max-w-sm italic opacity-80">{target.note}</p>
                </td>
                <td className="px-6 py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {getScopeTargetContextChips(target).map((chip) => (
                      <Badge key={`${target.id}-${chip}`} tone="soft" className="!lowercase !tracking-normal !px-2 !py-0.5 opacity-70 group-hover:opacity-100">
                        {formatEnum(chip)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="space-y-3">
                    {target.referenceUrl ? (
                      <a
                        href={target.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[rgba(3,6,8,0.4)] px-3 py-1.5 text-xs font-mono text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[rgba(0,212,168,0.1)]"
                      >
                        <span className="truncate max-w-[200px]">{getScopeTargetReference(target)}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-mono text-[var(--text-muted)]">
                        <span className="truncate max-w-[200px]">{getScopeTargetReference(target)}</span>
                      </span>
                    )}
                    <p className="text-[10px] font-bold font-mono tracking-widest text-[var(--text-muted)] uppercase">{target.location}</p>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <Badge tone={severityTone[target.severity]} className="!shadow-none">{formatEnum(target.severity)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
