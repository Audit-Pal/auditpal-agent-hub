import { useSearchParams } from 'react-router-dom'
import { ReportCenter } from '../submission/ReportCenter'
import { GatekeeperDashboard } from '../submission/GatekeeperDashboard'
import { ValidatorDashboard } from '../submission/ValidatorDashboard'
import type { ResearcherReport, ValidationAction } from '../../types/platform'

interface ReportsPageProps {
  sortedReports: ResearcherReport[]
  user: any
  navigate: (path: string) => void
  handleValidateReport: (reportId: string, action: ValidationAction, notes?: string) => Promise<boolean>
  handleValidateVulnerability: (vulnId: string, action: ValidationAction, notes?: string, rewardAmount?: number) => Promise<boolean>
  handleEditReport: (report: ResearcherReport) => void
}

export function ReportsPage({
  sortedReports,
  user,
  navigate,
  handleValidateReport,
  handleValidateVulnerability,
  handleEditReport,
}: ReportsPageProps) {
  const [searchParams] = useSearchParams()
  const filterProgramId = searchParams.get('programId')

  const filteredReports = filterProgramId
    ? sortedReports.filter((report) => report.programId === filterProgramId)
    : sortedReports

  const openCount = filteredReports.filter((report) => !['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'].includes(report.status)).length
  const closedCount = filteredReports.length - openCount

  if (user?.role === 'GATEKEEPER') {
    return (
      <div className="space-y-8 animate-fade-in">
        <section className="pb-4 mb-4 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pt-2 pb-4 lg:pt-4 lg:pb-8">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
                Intelligence Hub
              </div>
              <h1 className="font-['Fraunces',serif] text-5xl lg:text-7xl tracking-tight text-[#eef1f6] leading-[1.1]">
                Review Signal
              </h1>
              <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
                Escalate high-confidence findings and manage early-stage triage pipelines.
              </p>
            </div>
          </div>
        </section>
        <GatekeeperDashboard
          reports={filteredReports}
          onEscalate={(v) => handleValidateVulnerability(v.id, 'ESCALATE', '')}
          onReject={(v) => handleValidateVulnerability(v.id, 'REJECT', '')}
        />
      </div>
    )
  }

  if (user?.role === 'VALIDATOR') {
    return (
      <div className="space-y-8 animate-fade-in">
        <section className="pb-4 mb-4 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pt-2 pb-4 lg:pt-4 lg:pb-8">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
                Intelligence Hub
              </div>
              <h1 className="font-['Fraunces',serif] text-5xl lg:text-7xl tracking-tight text-[#eef1f6] leading-[1.1]">
                Finalize Reports
              </h1>
              <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
                Confirm criticality, assign severity metrics, and ship outcomes downstream.
              </p>
            </div>
          </div>
        </section>
        <ValidatorDashboard reports={filteredReports} onValidate={(v, a, n, r) => handleValidateVulnerability(v.id, a, n, r)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="pb-4 mb-4 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pt-2 pb-4 lg:pt-4 lg:pb-8">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
              Intelligence Hub
            </div>
            <h1 className="font-['Fraunces',serif] text-5xl lg:text-7xl tracking-tight text-[#eef1f6] leading-[1.1]">
              Applications
            </h1>
            <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
              Track submissions, active applications, and actionable next steps.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row gap-8 relative z-10 w-full lg:w-auto lg:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold mb-1">Open Items</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--text)]">{openCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-bold mb-1">Closed Items</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--text)]">{closedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReportCenter
        reports={filteredReports}
        viewerRole={user?.role ?? null}
        viewerName={user?.name ?? null}
        viewerId={user?.id ?? null}
        onBrowsePrograms={() => navigate('/bounties')}
        onOpenProgram={(programId) => navigate('/bounty/' + programId)}
        onValidate={handleValidateReport}
        onEditReport={handleEditReport}
      />
    </div>
  )
}
