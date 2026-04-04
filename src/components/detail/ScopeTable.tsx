import type { ScopeTarget, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { getScopeTargetContextChips, getScopeTargetReference } from '../../utils/scopeTargets'

interface ScopeTableProps {
    targets: readonly ScopeTarget[]
}

const severityTone: Record<Severity, 'critical' | 'high' | 'medium' | 'low'> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
}

export function ScopeTable({ targets }: ScopeTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#e6dfd3]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse bg-white">
          <thead className="bg-[#fbf8f2]">
            <tr className="border-b border-[#ebe4d8]">
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Target</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Coverage</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Reference</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Severity cap</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b border-[#f1ebe0] last:border-b-0">
                <td className="px-4 py-5">
                  <p className="font-medium text-[#171717]">{target.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f5a51]">{target.note}</p>
                </td>
                <td className="px-4 py-5">
                  <div className="flex flex-wrap gap-2">
                    {getScopeTargetContextChips(target).map((chip) => (
                      <Badge key={`${target.id}-${chip}`} tone="soft">
                        {chip}
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
                      className="inline-flex max-w-[320px] rounded-full border border-[#ebe4d8] bg-[#fbf8f2] px-3 py-1 text-sm text-[#315e50] transition hover:border-[#171717] hover:text-[#171717]"
                    >
                      <span className="truncate">{getScopeTargetReference(target)}</span>
                    </a>
                  ) : (
                    <span className="inline-flex max-w-[320px] rounded-full border border-[#ebe4d8] bg-[#fbf8f2] px-3 py-1 text-sm text-[#4b463f]">
                      <span className="truncate">{getScopeTargetReference(target)}</span>
                    </span>
                  )}
                  <p className="mt-2 text-sm text-[#6f695f]">{target.location}</p>
                </td>
                <td className="px-4 py-5">
                  <Badge tone={severityTone[target.severity]}>{target.severity}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
