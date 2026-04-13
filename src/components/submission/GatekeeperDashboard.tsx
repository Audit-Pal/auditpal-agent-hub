import { useState } from 'react'
import type { ResearcherReport, ValidationAction, Vulnerability } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { SubmissionPreview } from './SubmissionPreview'

export function GatekeeperDashboard({ reports, onEscalate, onReject }: { reports: ResearcherReport[], onEscalate: (v: Vulnerability) => void, onReject: (v: Vulnerability) => void }) {
  const [selectedReport, setSelectedReport] = useState<ResearcherReport | null>(null)

  if (selectedReport) {
    return (
      <div className="fixed inset-0 z-50 bg-white md:m-10 md:rounded-[40px] shadow-2xl overflow-hidden border border-[#d9d1c4]">
        <SubmissionPreview 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)}
          actions={
            <div className="flex gap-4">
               {selectedReport.vulnerabilities.filter(v => v.status === 'PENDING').map(vuln => (
                 <div key={vuln.id} className="flex gap-2 p-4 border rounded-2xl bg-[#fbf8f2] flex-1 justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{vuln.title}</p>
                      <p className="text-xs text-[#7b7468]">ID: {vuln.id}</p>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" onClick={() => onReject(vuln)}>Reject Noise</Button>
                       <Button variant="primary" size="sm" onClick={() => onEscalate(vuln)}>Escalate to Validator</Button>
                    </div>
                 </div>
               ))}
               {selectedReport.vulnerabilities.filter(v => v.status === 'PENDING').length === 0 && (
                 <p className="text-sm text-[#7b7468] italic py-2">All vulnerabilities in this report have been processed.</p>
               )}
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)]">
        <h1 className="font-serif text-5xl text-[#171717]">Gatekeeper Review</h1>
        <p className="mt-4 text-[#5f5a51]">Filter noise and escalate genuine findings from the automated intake.</p>
      </section>
      
      <div className="grid gap-6">
        {reports.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-[#d9d1c4] p-12 text-center bg-[#fbf8f2]/50">
            <p className="text-[#7b7468]">No reports waiting in the gatekeeper queue.</p>
          </div>
        ) : (
          reports.map((report) => {
            const pendingCount = report.vulnerabilities.filter(v => v.status === 'PENDING').length
            if (pendingCount === 0) return null
            
            return (
              <article key={report.id} className="rounded-[30px] border border-[#d9d1c4] bg-white p-6 flex items-center justify-between gap-6 shadow-sm transition hover:border-[#171717]">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-[#fbf8f2] border border-[#ebe4d8] flex items-center justify-center text-xl font-bold text-[#315e50]">
                    {report.humanId.split('-')[1]}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#171717]">{report.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone="soft">{report.programName}</Badge>
                      <Badge tone="accent">{pendingCount} pending findings</Badge>
                      <span className="text-xs text-[#7b7468]">AI Score: {report.aiScore?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="md" onClick={() => setSelectedReport(report)}>
                  Review Findings
                </Button>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
