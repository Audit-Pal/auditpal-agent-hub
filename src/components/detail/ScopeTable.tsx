import type { ScopeTarget, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'

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
        <table className="w-full min-w-[760px] border-collapse bg-white">
          <thead className="bg-[#fbf8f2]">
            <tr className="border-b border-[#ebe4d8]">
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Asset</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Type</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Location</th>
              <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Severity cap</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b border-[#f1ebe0] last:border-b-0">
                <td className="px-4 py-5 font-medium text-[#171717]">{target.label}</td>
                <td className="px-4 py-5">
                  <Badge tone="soft">{target.assetType}</Badge>
                </td>
                <td className="px-4 py-5">
                  <span className="rounded-full border border-[#ebe4d8] bg-[#fbf8f2] px-3 py-1 text-sm text-[#4b463f]">
                    {target.location}
                  </span>
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
