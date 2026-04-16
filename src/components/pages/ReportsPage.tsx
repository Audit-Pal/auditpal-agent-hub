import { useSearchParams } from 'react-router-dom'
import { MetricCard } from '../common/MetricCard'
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
        <section className="hero-card rounded-[36px] p-8 md:p-10">
          <p className="section-kicker">Triage</p>
          <h1 className="mt-4 font-serif text-5xl text-[var(--text)]">Review signal.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
            Escalate high-confidence findings.
          </p>
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
        <section className="hero-card rounded-[36px] p-8 md:p-10">
          <p className="section-kicker">Validation</p>
          <h1 className="mt-4 font-serif text-5xl text-[var(--text)]">Finalize reports.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
            Confirm criticality and ship outcomes.
          </p>
        </section>
        <ValidatorDashboard reports={filteredReports} onValidate={(v, a, n, r) => handleValidateVulnerability(v.id, a, n, r)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="hero-card rounded-[38px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-kicker">Applications</p>
            <h1 className="section-title mt-4 max-w-4xl">Track submissions and next actions.</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              Status, notes, and context.
            </p>
          </div>

          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Open items" value={openCount} note="Reports still moving through triage or decision stages" />
            <MetricCard label="Closed items" value={closedCount} note="Resolved, rejected, duplicate, or completed reports" />
          </aside>
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
