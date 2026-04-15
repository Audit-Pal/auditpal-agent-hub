import React from 'react'
import type { ResearcherReport } from '../../types/platform'
import { Badge } from '../common/Badge'
import { formatEnum } from '../../utils/formatters'

interface SubmissionPreviewProps {
  report: ResearcherReport
  onClose: () => void
  actions?: React.ReactNode
}

export function SubmissionPreview({ report, onClose, actions }: SubmissionPreviewProps) {
  return (
    <div className="flex flex-col h-full bg-[#fffdf8]">
      <div className="flex items-center justify-between border-b border-[#ebe4d8] px-8 py-6">
        <div>
          <div className="flex items-center gap-3">
             <Badge tone="soft">{report.humanId}</Badge>
             <h2 className="text-2xl font-serif text-[#171717]">{report.title}</h2>
          </div>
          <p className="mt-1 text-sm text-[#7b7468]">
            Submitted by {report.reporterName} · {report.programName}
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-[#7b7468] hover:bg-[#ebe4d8]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="space-y-10">
          {/* Summary Section */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b7468]">Discovery Summary</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#7b7468]">Current Status</p>
                <p className="mt-1 font-semibold">{formatEnum(report.status)}</p>
              </div>
              <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#7b7468]">AI Score</p>
                <p className="mt-1 font-semibold">{report.aiScore?.toFixed(1) || 'N/A'}</p>
              </div>
              <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#7b7468]">SLA Remaining</p>
                <p className="mt-1 font-semibold">12h 45m</p>
              </div>
              <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#7b7468]">Bounty Range</p>
                <p className="mt-1 font-semibold">Up to $50k</p>
              </div>
            </div>
            <p className="mt-6 text-base leading-8 text-[#4b463f]">{report.vulnerabilities?.[0]?.summary}</p>
          </section>

          {/* Vulnerabilities List */}
          <section className="space-y-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b7468]">Vulnerabilities ({report.vulnerabilities?.length})</h3>
            <div className="space-y-4">
              {report.vulnerabilities?.map((vuln, idx) => (
                <div key={vuln.id} className="rounded-[28px] border border-[#d9d1c4] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Badge tone="accent">Finding #{idx + 1}</Badge>
                    <Badge tone={vuln.severity === 'CRITICAL' ? 'critical' : vuln.severity === 'HIGH' ? 'high' : 'medium'}>
                      {vuln.severity}
                    </Badge>
                  </div>
                  <h4 className="mt-4 text-xl font-semibold text-[#171717]">{vuln.title}</h4>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-[#4b463f]">
                    <div>
                      <span className="font-semibold text-[#171717]">Impact:</span> {vuln.impact}
                    </div>
                    <div>
                      <span className="font-semibold text-[#171717]">Proof of Concept:</span>
                      <div className="mt-2 rounded-2xl bg-[#fbf8f2] p-4 text-[#171717]">
                        {vuln.proof}
                      </div>
                    </div>
                  </div>

                  {vuln.codeSnippet && (
                    <div className="mt-6">
                      <p className="text-[11px] font-semibold text-[#7b7468] uppercase mb-2">Code Context: {vuln.errorLocation}</p>
                      <pre className="overflow-x-auto rounded-xl bg-[#171717] p-5 text-sm text-[#ebe4d8] leading-6">
                        <code>{vuln.codeSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* AI/Context */}
          {report.aiSummary && (
            <section className="rounded-3xl border border-[#ebe4d8] bg-[#fbf8f2] p-6 lg:p-8">
               <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b7468]">AuditPal AI Insights</h3>
               <p className="mt-4 text-sm leading-8 text-[#4b463f]">{report.aiSummary}</p>
            </section>
          )}
        </div>
      </div>

      {actions && (
        <div className="border-t border-[#ebe4d8] bg-white px-8 py-6">
          {actions}
        </div>
      )}
    </div>
  )
}
