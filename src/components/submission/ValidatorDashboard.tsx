import { useState } from 'react'
import type { ResearcherReport, ValidationAction, Vulnerability } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { SubmissionPreview } from './SubmissionPreview'

export function ValidatorDashboard({ reports, onValidate }: { reports: ResearcherReport[], onValidate: (v: Vulnerability, action: ValidationAction, notes: string, rewardAmount?: number) => Promise<boolean> }) {
  const [selectedReport, setSelectedReport] = useState<ResearcherReport | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [rewards, setRewards] = useState<Record<string, number>>({})
  const [activeValidationId, setActiveValidationId] = useState<string | null>(null)
  const [payoutStatus, setPayoutStatus] = useState<Record<string, string>>({})

  const handleValidation = async (vuln: Vulnerability, action: ValidationAction) => {
    setActiveValidationId(vuln.id)
    try {
        const success = await onValidate(vuln, action, notes[vuln.id] || '', rewards[vuln.id])
        if (success && action === 'ACCEPT') {
          setPayoutStatus(curr => ({ ...curr, [vuln.id]: '0x' + Math.random().toString(16).slice(2, 42) }))
        }
        setNotes(curr => ({ ...curr, [vuln.id]: '' }))
    } finally {
        setActiveValidationId(null)
    }
  }

  if (selectedReport) {
    const escalatedVulns = selectedReport.vulnerabilities.filter(v => v.status === 'ESCALATED')
    return (
      <div className="fixed inset-0 z-50 bg-white md:m-10 md:rounded-[40px] shadow-2xl overflow-hidden border border-[#d9d1c4]">
        <SubmissionPreview 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)}
          actions={
            <div className="space-y-4">
               {escalatedVulns.length === 0 ? (
                  <p className="text-sm text-[#7b7468] italic py-2 text-center">No escalated findings in this report.</p>
               ) : escalatedVulns.map(vuln => (
                 <div key={vuln.id} className="p-5 border rounded-[28px] bg-[#fbf8f2] shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-lg">{vuln.title}</p>
                        <p className="text-xs text-[#7b7468]">Reported Severity: {vuln.severity} | Target: {vuln.target}</p>
                      </div>
                      <Badge tone="accent">Escalated finding</Badge>
                    </div>

                    {payoutStatus[vuln.id] ? (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                               <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                               </svg>
                            </div>
                            <div>
                               <p className="text-sm font-semibold text-green-800">Reward Distributed</p>
                               <p className="text-xs text-green-600 font-mono truncate max-w-[300px]">TX: {payoutStatus[vuln.id]}</p>
                            </div>
                         </div>
                         <Badge tone="success">PAID</Badge>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <textarea
                              rows={2}
                              value={notes[vuln.id] || ''}
                              onChange={e => setNotes(c => ({...c, [vuln.id]: e.target.value}))}
                              placeholder="Final validator notes (visible to researcher)..."
                              className="w-full rounded-2xl border border-[#d9d1c4] p-4 text-sm outline-none focus:border-[#171717]"
                          />
                          <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7b7468]">Reward Amount (USDC)</label>
                             <input 
                                type="number" 
                                value={rewards[vuln.id] || ''}
                                onChange={e => setRewards(c => ({...c, [vuln.id]: Number(e.target.value)}))}
                                className="w-full rounded-2xl border border-[#d9d1c4] p-4 text-sm underline-none outline-none focus:border-[#171717]"
                                placeholder="Assign reward..."
                             />
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="primary" size="md" onClick={() => handleValidation(vuln, 'ACCEPT')} disabled={activeValidationId === vuln.id}>
                              {activeValidationId === vuln.id ? 'Processing...' : 'Authorize Payout'}
                           </Button>
                           <Button variant="ghost" size="md" onClick={() => handleValidation(vuln, 'REJECT')} disabled={activeValidationId === vuln.id}>
                              Reject Finding
                           </Button>
                        </div>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)]">
        <h1 className="font-serif text-5xl text-[#171717]">Validator Workspace</h1>
        <p className="mt-4 text-[#5f5a51]">Assign severity and authorize crypto rewards for escalated findings.</p>
      </section>

      <div className="grid gap-6">
        {reports.filter(r => r.vulnerabilities.some(v => v.status === 'ESCALATED')).length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-[#d9d1c4] p-12 text-center bg-[#fbf8f2]/50">
            <p className="text-[#7b7468]">No escalated reports waiting for final validation.</p>
          </div>
        ) : (
          reports.map((report) => {
             const escalatedCount = report.vulnerabilities.filter(v => v.status === 'ESCALATED').length
             if (escalatedCount === 0) return null
             return (
               <article key={report.id} className="rounded-[30px] border border-[#d9d1c4] bg-white p-6 flex items-center justify-between gap-6 shadow-sm transition hover:border-[#171717]">
                 <div className="flex items-center gap-6">
                   <div className="h-14 w-14 rounded-2xl bg-[#effaf6] border border-[#315e50]/20 flex items-center justify-center text-xl font-bold text-[#315e50]">
                     {report.humanId.split('-')[1]}
                   </div>
                   <div>
                     <h3 className="text-xl font-semibold text-[#171717]">{report.title}</h3>
                     <div className="flex items-center gap-2 mt-1">
                       <Badge tone="soft">{report.programName}</Badge>
                       <Badge tone="high">{escalatedCount} escalated findings</Badge>
                     </div>
                   </div>
                 </div>
                 <Button variant="outline" size="md" onClick={() => setSelectedReport(report)}>
                   Validate Finding
                 </Button>
               </article>
             )
          })
        )}
      </div>
    </div>
  )
}
