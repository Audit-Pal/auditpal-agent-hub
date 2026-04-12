import { useState } from 'react'
import type { ResearcherReport, ValidationAction } from '../../types/platform'
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
  onValidate?: (reportId: string, action: ValidationAction, notes?: string) => Promise<boolean>
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

function getSeverityTone(severity: ResearcherReport['severity']) {
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
  const [activeValidationId, setActiveValidationId] = useState<string | null>(null)

  const renderReportCard = (report: ResearcherReport) => {
    const graphChips = buildGraphChips(report)
    const graphContext = report.structuredData?.graphContext
    const awaitingValidation = canValidate && ['AI_TRIAGED', 'TRIAGED', 'ESCALATED'].includes(report.status)

    return (
      <article
        key={report.id}
        className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="soft">{report.humanId}</Badge>
              <Badge tone={getSeverityTone(report.severity)}>{formatEnum(report.severity)}</Badge>
              <Badge tone={getStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
              <Badge tone="soft">{formatEnum(report.source)}</Badge>
            </div>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-[#171717]">{report.title}</h2>
            <button
              onClick={() => onOpenProgram(report.programId)}
              className="mt-2 text-sm font-medium text-[#315e50] transition hover:text-[#171717]"
            >
              {report.programName || 'Bounty'}{report.programCode ? ` · ${report.programCode}` : ''}
            </button>
            <p className="mt-2 text-sm text-[#6f695f]">
              Submitted by {report.reporterName}{report.decisionOwner ? ` · Validator: ${report.decisionOwner}` : ''}
            </p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">{report.summary}</p>

            {onEditReport && isEditable(report, viewerRole, viewerId) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditReport(report)}
                >
                  Edit application
                </Button>
              </div>
            )}
          </div>

          <div className="min-w-[240px] rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Next action</p>
            <p className="mt-2 text-sm leading-7 text-[#171717]">{report.nextAction || 'Awaiting next queue update.'}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Target</p>
            <p className="mt-2 text-sm text-[#171717]">{report.target}</p>
          </div>
          <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Route</p>
            <p className="mt-2 text-sm text-[#171717]">{report.route}</p>
          </div>
          <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Submitted</p>
            <p className="mt-2 text-sm text-[#171717]">{formatDate(report.submittedAt)}</p>
          </div>
          <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Response SLA</p>
            <p className="mt-2 text-sm text-[#171717]">{report.responseSla || 'Pending bounty SLA'}</p>
          </div>
          <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">AI score</p>
            <p className="mt-2 text-sm text-[#171717]">{report.aiScore !== null && report.aiScore !== undefined ? report.aiScore.toFixed(1) : 'Not scored'}</p>
          </div>
        </div>

        {(report.aiSummary || report.validationDecision || report.validationNotes || report.note) && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {report.aiSummary && (
              <div className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">AI triage</p>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">{report.aiSummary}</p>
              </div>
            )}
            {(report.validationDecision || report.validationNotes || report.note) && (
              <div className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Human decision</p>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                  {report.validationDecision ? `Decision: ${formatEnum(report.validationDecision)}. ` : ''}
                  {report.validationNotes || report.note || 'No validator note attached yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Impact and proof notes</p>
          <p className="mt-3 text-sm leading-7 text-[#4b463f]">
            <span className="font-medium text-[#171717]">Impact:</span> {report.impact}
          </p>
          <p className="mt-2 text-sm leading-7 text-[#4b463f]">
            <span className="font-medium text-[#171717]">Proof:</span> {report.proof}
          </p>
        </div>

        {(graphChips.length > 0 || graphContext) && (
          <div className="mt-5 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Graph seed context</p>
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
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Attack vector</p>
                <p className="mt-2 text-sm leading-7 text-[#4b463f]">{graphContext?.attackVector || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Root cause</p>
                <p className="mt-2 text-sm leading-7 text-[#4b463f]">{graphContext?.rootCause || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl border border-[#e6dfd3] bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Prerequisites</p>
                <p className="mt-2 text-sm leading-7 text-[#4b463f]">{graphContext?.prerequisites || 'None listed'}</p>
              </div>
            </div>
          </div>
        )}

        {(report.errorLocation || report.codeSnippet) && (
          <div className="mt-5 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Code context</p>
              {report.errorLocation && <Badge tone="soft">{report.errorLocation}</Badge>}
            </div>
            {report.codeSnippet && (
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]">
                <code>{report.codeSnippet}</code>
              </pre>
            )}
          </div>
        )}

        {awaitingValidation && onValidate && (
          <div className="mt-5 rounded-[26px] border border-[#d9d1c4] bg-[#fff7e8] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Human validator action</p>
            <textarea
              rows={3}
              value={validationNotes[report.id] || ''}
              onChange={(event) => setValidationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
              placeholder="Optional validator note for the accept, reject, or escalate decision."
              className="mt-3 w-full rounded-[22px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleValidation(report.id, 'ACCEPT')}
                disabled={activeValidationId !== null}
              >
                {activeValidationId === `${report.id}:ACCEPT` ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleValidation(report.id, 'ESCALATE')}
                disabled={activeValidationId !== null}
              >
                {activeValidationId === `${report.id}:ESCALATE` ? 'Escalating...' : 'Escalate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleValidation(report.id, 'REJECT')}
                disabled={activeValidationId !== null}
              >
                {activeValidationId === `${report.id}:REJECT` ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </article>
    )
  }

  const canValidate = viewerRole === 'ORGANIZATION' || viewerRole === 'ADMIN'
  const totalReports = reports.length
  const triagedReports = reports.filter((report) => ['AI_TRIAGED', 'TRIAGED', 'ESCALATED', 'ACCEPTED', 'RESOLVED'].includes(report.status)).length
  const validationReady = reports.filter((report) => ['AI_TRIAGED', 'TRIAGED', 'ESCALATED'].includes(report.status)).length
  const acceptedReports = reports.filter((report) => report.status === 'ACCEPTED' || report.status === 'RESOLVED').length
  const lowEffortReports = reports.filter((report) => report.status === 'LOW_EFFORT').length
  const uniquePrograms = new Set(reports.map((report) => report.programId)).size
  const latestReport = reports[0]

  const handleValidation = async (reportId: string, action: ValidationAction) => {
    if (!onValidate) return

    const requestId = `${reportId}:${action}`
    setActiveValidationId(requestId)

    try {
      const success = await onValidate(reportId, action, validationNotes[reportId]?.trim() || undefined)
      if (success) {
        setValidationNotes((current) => ({ ...current, [reportId]: '' }))
      }
    } finally {
      setActiveValidationId(null)
    }
  }

  if (reports.length === 0) {
    return (
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)] md:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">
          {canValidate ? 'Application queue' : 'Application center'}
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-[#171717] md:text-6xl">
          {canValidate ? 'No applications are waiting in the queue yet.' : 'Track every finding from the same workspace.'}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f5a51]">
          {canValidate
            ? 'Once bounty hunters submit structured applications and they pass low-effort filtering plus AI triage, they will appear here for accept, reject, or escalate decisions.'
            : 'This view becomes useful as soon as you submit your first application. Every submission now moves through low-effort filtering, AI triage, and organization validation.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" size="md" onClick={onBrowsePrograms}>
            Browse bounties
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">
              {canValidate ? 'Application queue' : 'Application center'}
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
              {canValidate ? 'AI-triaged applications waiting for a human decision.' : 'Your applications, status changes, and next steps.'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f5a51]">
              {canValidate
                ? `Review findings that already passed low-effort filtering and AI triage. ${viewerName || 'Your team'} can accept, reject, or escalate each application from this queue.`
                : 'Every submitted application now carries the structured metadata, code context, and status updates needed for the full intake workflow.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="md" onClick={onBrowsePrograms}>
              Browse bounties
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Applications submitted</p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{totalReports}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">
              {canValidate ? 'Ready for review' : 'Already triaged'}
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{canValidate ? validationReady : triagedReports}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">
              {canValidate ? 'Accepted or closed' : 'Bounties touched'}
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{canValidate ? acceptedReports : uniquePrograms}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">
              {canValidate ? 'Low-effort filtered' : 'Latest activity'}
            </p>
            <p className="mt-3 text-lg font-semibold text-[#171717]">
              {canValidate ? lowEffortReports : latestReport ? formatDate(latestReport.submittedAt) : 'No activity yet'}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-12">
          {canValidate ? (
            // State-wise view for organizations
            <>
              {[
                {
                  title: 'Ready for Decision',
                  description: 'Applications that have passed AI triage and are waiting for your final validation.',
                  statuses: ['AI_TRIAGED', 'TRIAGED', 'ESCALATED'],
                },
                {
                  title: 'In Progress / Needs Info',
                  description: 'Applications that are currently being triaged or require more information from the researcher.',
                  statuses: ['SUBMITTED', 'NEEDS_INFO'],
                },
                {
                  title: 'Finalized',
                  description: 'Applications that have been accepted, rejected, or marked as low effort.',
                  statuses: ['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'],
                },
              ].map((group) => {
                const groupReports = reports.filter((r) => group.statuses.includes(r.status))
                if (groupReports.length === 0) return null

                return (
                  <div key={group.title} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-[#171717]">{group.title}</h2>
                      <p className="mt-1 text-sm text-[#7b7468]">{group.description}</p>
                    </div>
                    <div className="space-y-4">
                      {groupReports.map((report) => renderReportCard(report))}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            // Default list view for researchers
            reports.map((report) => renderReportCard(report))
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How this flow works</p>
            <div className="mt-4 space-y-3">
              {(canValidate
                ? [
                  'Low-effort submissions are filtered out before they reach this queue.',
                  'Only AI-triaged applications should be accepted, rejected, or escalated here.',
                  'Accepted applications stay persisted with graph context, code evidence, and validator notes.',
                ]
                : [
                  'Submit a structured application with the graph seed, code context, and replay narrative.',
                  'Low-effort filtering and AI triage run before the application reaches a human validator.',
                  'Status, validator notes, and accepted findings stay visible from the same workspace.',
                ]).map((item, index) => (
                  <div key={item} className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                    <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                  </div>
                ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Queue snapshot</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#4b463f]">
              <p>AI triaged: {reports.filter((report) => report.status === 'AI_TRIAGED').length}</p>
              <p>Escalated: {reports.filter((report) => report.status === 'ESCALATED').length}</p>
              <p>Accepted: {acceptedReports}</p>
              <p>Low effort filtered: {lowEffortReports}</p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
