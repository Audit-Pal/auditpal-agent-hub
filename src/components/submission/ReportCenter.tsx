import { useState } from 'react'
import type { ResearcherReport, ValidationAction, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { formatEnum } from '../../utils/formatters'
import { Link } from 'react-router-dom'


interface ReportCenterProps {
  reports: readonly ResearcherReport[]
  viewerRole?: 'BOUNTY_HUNTER' | 'ORGANIZATION' | 'ADMIN' | null
  viewerName?: string | null
  viewerId?: string | null
  onBrowsePrograms: () => void
  onOpenProgram: (programId: string) => void
  onValidate?: (reportId: string, action: ValidationAction, notes?: string, severity?: string) => Promise<boolean>
  onEditReport?: (report: ResearcherReport) => void
}

function isEditable(report: ResearcherReport, viewerRole?: string | null, viewerId?: string | null) {
  if (viewerRole === 'ADMIN') return true
  if (viewerRole !== 'BOUNTY_HUNTER') return false
  if (viewerId && report.reporterId && viewerId !== report.reporterId) return false

  const submittedAt = new Date(report.submittedAt).getTime()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  return now - submittedAt < oneHour
}

function getStatusTone(status: ResearcherReport['status']) {
  switch (status) {
    case 'SUBMITTED':
      return 'new' as const
    case 'AI_TRIAGED':
    case 'TRIAGED':
    case 'NEEDS_INFO':
      return 'accent' as const
    case 'ACCEPTED':
    case 'RESOLVED':
      return 'success' as const
    case 'ESCALATED':
      return 'high' as const
    case 'LOW_EFFORT':
    case 'REJECTED':
    case 'DUPLICATE':
      return 'critical' as const
    default:
      return 'soft' as const
  }
}

function getSeverityTone(severity: Severity) {
  if (severity === 'CRITICAL') return 'critical' as const
  if (severity === 'HIGH') return 'high' as const
  if (severity === 'MEDIUM') return 'medium' as const
  return 'low' as const
}

function formatDate(value?: string | null) {
  if (!value) return 'Pending'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}



export function ReportCenter({
  reports,
  viewerRole,
  viewerName,
  viewerId,
  onBrowsePrograms,
  onOpenProgram,
  onEditReport,
}: ReportCenterProps) {


  const [filterState, setFilterState] = useState<'ALL' | 'REJECTED' | 'ACCEPTED' | 'RESOLVED'>('ALL')

  if (reports.length === 0) {
    return (
      <section className="p-8 text-center md:p-12 border-b border-[rgba(255,255,255,0.06)] pb-12 mb-4">
        <p className="section-kicker">Application center</p>
        <h2 className="mt-4 font-serif text-4xl text-[var(--text)]">No submissions are showing up yet.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-soft)]">
          {viewerName
            ? `${viewerName}, once you submit or receive program activity it will appear here with status, next actions, and decision context.`
            : 'Browse the bounty directory to submit a report or sign in to see queue activity attached to your account.'}
        </p>
        <Button variant="outline" size="md" className="mt-6" onClick={onBrowsePrograms}>
          Browse programs
        </Button>
      </section>
    )
  }

  const filteredDisplayReports = reports.filter((report) => {
    if (filterState === 'ALL') return true
    return report.status === filterState
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-4">
        <button
          onClick={() => setFilterState('ALL')}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${filterState === 'ALL' ? 'bg-[var(--accent-strong)] text-black' : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.08)]'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilterState('ACCEPTED')}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${filterState === 'ACCEPTED' ? 'bg-[var(--accent-strong)] text-black' : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.08)]'}`}
        >
          To-Reward
        </button>
        <button
          onClick={() => setFilterState('RESOLVED')}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${filterState === 'RESOLVED' ? 'bg-[var(--accent-strong)] text-black' : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.08)]'}`}
        >
          Rewarded
        </button>
        <button
          onClick={() => setFilterState('REJECTED')}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${filterState === 'REJECTED' ? 'bg-[var(--accent-strong)] text-black' : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.08)]'}`}
        >
          Rejected
        </button>
      </div>

      <div className="space-y-5">
        {filteredDisplayReports.map((report) => {
          const primaryVulnerability = report.vulnerabilities?.[0]
          
          return (
            <article key={report.id} className="group relative rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-5 py-6 backdrop-blur-[16px] transition duration-300 hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(12,19,28,0.36)]">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex-1 min-w-[300px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="soft">{report.humanId}</Badge>
                    {primaryVulnerability && <Badge tone={getSeverityTone(primaryVulnerability.severity)}>Severity: {formatEnum(primaryVulnerability.severity)}</Badge>}
                    <Badge tone={getStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                    {report.vulnerabilities?.length && report.vulnerabilities.length > 1 && (
                      <Badge tone="accent">+{report.vulnerabilities.length - 1} findings</Badge>
                    )}
                  </div>

                  <h2 className="mt-4 font-serif text-2xl leading-tight text-[var(--text)]">{report.title}</h2>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-soft)]">
                    <button
                      onClick={() => onOpenProgram(report.programId)}
                      className="font-bold text-[var(--accent-strong)] hover:underline"
                    >
                      {report.programName || 'Program'}{report.programCode ? ` · ${report.programCode}` : ''}
                    </button>
                    <span>•</span>
                    <span>Submitted by {report.reporterName}</span>
                    <span>•</span>
                    <span>{formatDate(report.submittedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">AI Score</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
                      {report.aiScore !== null && report.aiScore !== undefined ? report.aiScore.toFixed(1) : '—'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {onEditReport && isEditable(report, viewerRole, viewerId) && (
                      <Button variant="outline" size="sm" onClick={() => onEditReport(report)}>
                        Edit
                      </Button>
                    )}
                    <Link to={`/report/${report.id}`}>
                      <Button variant="primary" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {report.nextAction && report.status !== 'REJECTED' && (
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-strong)]">Next Action</p>
                  <p className="mt-1 text-xs text-[var(--text-soft)] line-clamp-1">
                    {report.status === 'ACCEPTED' ? 'Reward distribution' : report.nextAction}
                  </p>
                </div>
              )}
            </article>
          )
        })}
        {filteredDisplayReports.length === 0 && (
          <div className="py-8 text-center text-[var(--text-muted)] text-sm">No reports match the selected filter.</div>
        )}
      </div>
    </div>
  )
}
