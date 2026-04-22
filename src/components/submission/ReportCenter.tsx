import { useState } from 'react'
import type { ResearcherReport, ValidationAction, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { formatEnum } from '../../utils/formatters'

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

function buildGraphChips(report: ResearcherReport) {
  const graphContext = report.structuredData?.graphContext
  return [
    graphContext?.vulnerabilityClass,
    graphContext?.affectedAsset,
    graphContext?.affectedComponent,
    graphContext?.reporterAgent,
    ...(graphContext?.tags || []),
  ].filter(Boolean) as string[]
}

export function ReportCenter({
  reports,
  viewerRole,
  viewerName,
  viewerId,
  onBrowsePrograms,
  onOpenProgram,
  onValidate,
  onEditReport,
}: ReportCenterProps) {
  const [validationNotes, setValidationNotes] = useState<Record<string, string>>({})
  const [validationSeverity, setValidationSeverity] = useState<Record<string, string>>({})
  const [activeValidationId, setActiveValidationId] = useState<string | null>(null)

  const canValidate = viewerRole === 'ADMIN' || viewerRole === 'ORGANIZATION'
  const actionableCount = reports.filter((report) => !['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'].includes(report.status)).length
  const acceptedCount = reports.filter((report) => ['ACCEPTED', 'RESOLVED'].includes(report.status)).length

  const handleValidation = async (reportId: string, action: ValidationAction) => {
    if (!onValidate) return

    setActiveValidationId(reportId)
    try {
      await onValidate(reportId, action, validationNotes[reportId], validationSeverity[reportId])
    } finally {
      setActiveValidationId(null)
    }
  }

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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card rounded-[28px] p-5">
          <p className="section-kicker !tracking-[0.18em]">Total reports</p>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{reports.length}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">All visible application records in this workspace.</p>
        </div>
        <div className="surface-card rounded-[28px] p-5">
          <p className="section-kicker !tracking-[0.18em]">Needs action</p>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{actionableCount}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">Reports still moving through AI or human review.</p>
        </div>
        <div className="surface-card rounded-[28px] p-5">
          <p className="section-kicker !tracking-[0.18em]">Accepted or resolved</p>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{acceptedCount}</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">Confirmed signal that has reached a positive outcome.</p>
        </div>
      </section>

      <div className="space-y-5">
        {reports.map((report) => {
          const graphChips = buildGraphChips(report)
          const graphContext = report.structuredData?.graphContext
          const primaryVulnerability = report.vulnerabilities?.[0]
          const currentSeverity = validationSeverity[report.id] || primaryVulnerability?.severity || 'LOW'
          const awaitingValidation = canValidate && ['AI_TRIAGED', 'TRIAGED', 'ESCALATED', 'SUBMITTED', 'LOW_EFFORT', 'NEEDS_INFO'].includes(report.status)

          return (
            <article key={report.id} className="group relative cursor-pointer border-b border-[rgba(255,255,255,0.04)] last:border-b-0 py-6 transition duration-300 hover:bg-[rgba(255,255,255,0.015)] px-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="soft">{report.humanId}</Badge>
                    {primaryVulnerability && <Badge tone={getSeverityTone(primaryVulnerability.severity)}>Severity: {formatEnum(primaryVulnerability.severity)}</Badge>}
                    <Badge tone={getStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                    <Badge tone="soft">{formatEnum(report.source)}</Badge>
                    {report.vulnerabilities?.length && report.vulnerabilities.length > 1 && (
                      <Badge tone="accent">+{report.vulnerabilities.length - 1} findings</Badge>
                    )}
                  </div>

                  <h2 className="mt-4 font-serif text-3xl leading-tight text-[var(--text)]">{report.title}</h2>
                  <button
                    onClick={() => onOpenProgram(report.programId)}
                    className="mt-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:text-[var(--text)]"
                  >
                    {report.programName || 'Program'}{report.programCode ? ` · ${report.programCode}` : ''}
                  </button>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Submitted by {report.reporterName}{report.decisionOwner ? ` · Validator: ${report.decisionOwner}` : ''}
                  </p>

                  {primaryVulnerability && <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{primaryVulnerability.summary}</p>}

                  {onEditReport && isEditable(report, viewerRole, viewerId) && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={() => onEditReport(report)}>
                        Edit application
                      </Button>
                    </div>
                  )}
                </div>

                <div className="surface-card-muted min-w-[250px] rounded-[26px] p-4">
                  <p className="section-kicker !tracking-[0.18em]">Next action</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text)]">{report.nextAction || 'Awaiting the next queue update.'}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <div className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Primary target</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">{primaryVulnerability?.target || 'Unknown'}</p>
                </div>
                <div className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Route</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">{report.route}</p>
                </div>
                <div className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Submitted</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">{formatDate(report.submittedAt)}</p>
                </div>
                <div className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Response SLA</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">{report.responseSla || 'Pending bounty SLA'}</p>
                </div>
                <div className="surface-card-muted rounded-[22px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">AI score</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text)]">{report.aiScore !== null && report.aiScore !== undefined ? report.aiScore.toFixed(1) : 'Not scored'}</p>
                </div>
              </div>

              {(report.aiSummary || report.note) && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {report.aiSummary && (
                    <div className="surface-card-muted rounded-[26px] p-4">
                      <p className="section-kicker !tracking-[0.18em]">AI triage</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{report.aiSummary}</p>
                    </div>
                  )}
                  {report.note && (
                    <div className="surface-card-muted rounded-[26px] p-4">
                      <p className="section-kicker !tracking-[0.18em]">
                        {report.status === 'LOW_EFFORT' ? 'Automated filter' : 'Human decision'}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{report.note}</p>
                    </div>
                  )}
                </div>
              )}

              {primaryVulnerability && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="surface-card-muted rounded-[26px] p-4">
                    <p className="section-kicker !tracking-[0.18em]">Impact</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{primaryVulnerability.impact}</p>
                  </div>
                  <div className="surface-card-muted rounded-[26px] p-4">
                    <p className="section-kicker !tracking-[0.18em]">Proof</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{primaryVulnerability.proof}</p>
                  </div>
                </div>
              )}

              {(graphChips.length > 0 || graphContext) && (
                <div className="surface-card-muted mt-5 rounded-[26px] p-4">
                  <p className="section-kicker !tracking-[0.18em]">Graph seed context</p>
                  {graphChips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {graphChips.map((chip) => (
                        <Badge key={`${report.id}-${chip}`} tone="soft">
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.8)] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Attack vector</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{graphContext?.attackVector || 'Not provided'}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.8)] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Root cause</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{graphContext?.rootCause || 'Not provided'}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.8)] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Prerequisites</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{graphContext?.prerequisites || 'None listed'}</p>
                    </div>
                  </div>
                </div>
              )}

              {primaryVulnerability && (primaryVulnerability.errorLocation || primaryVulnerability.codeSnippet) && (
                <div className="surface-card-muted mt-5 rounded-[26px] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="section-kicker !tracking-[0.18em]">Primary code context</p>
                    {primaryVulnerability.errorLocation && <Badge tone="soft">{primaryVulnerability.errorLocation}</Badge>}
                  </div>
                  {primaryVulnerability.codeSnippet && (
                    <pre className="mt-3 overflow-x-auto rounded-[20px] border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.88)] p-4 text-sm leading-6 text-[var(--text)]">
                      <code>{primaryVulnerability.codeSnippet}</code>
                    </pre>
                  )}
                </div>
              )}

              {awaitingValidation && onValidate && (
                <div className="mt-5 rounded-[26px] border border-[rgba(15,118,110,0.12)] bg-[rgba(30,186,152,0.12)] p-4">
                  <p className="section-kicker !tracking-[0.18em]">Human validator action</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Final criticality</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
                          const isSelected = currentSeverity === severity
                          return (
                            <button
                              key={severity}
                              type="button"
                              onClick={() => setValidationSeverity((current) => ({ ...current, [report.id]: severity }))}
                              className={[
                                'rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition',
                                isSelected
                                  ? 'bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-[#021614]'
                                  : 'border border-[rgba(15,23,38,0.1)] bg-[rgba(9,18,27,0.8)] text-[var(--text-soft)] hover:border-[rgba(15,118,110,0.22)] hover:text-[var(--accent-strong)]',
                              ].join(' ')}
                            >
                              {severity}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Decision notes</label>
                      <textarea
                        value={validationNotes[report.id] || ''}
                        onChange={(event) => setValidationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                        className="field-area !min-h-[116px]"
                        placeholder="Add guidance, payout rationale, or next-step details for the reporter."
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary" size="sm" onClick={() => handleValidation(report.id, 'ACCEPT')} disabled={activeValidationId === report.id}>
                        {activeValidationId === report.id ? 'Saving...' : 'Accept report'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleValidation(report.id, 'ESCALATE')} disabled={activeValidationId === report.id}>
                        Escalate
                      </Button>
                      <Button variant="ghost" size="sm" className="border border-[rgba(15,23,38,0.08)] bg-[rgba(9,18,27,0.78)]" onClick={() => handleValidation(report.id, 'REJECT')} disabled={activeValidationId === report.id}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
