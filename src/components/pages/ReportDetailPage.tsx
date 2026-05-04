import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import type { ResearcherReport, ValidationAction, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { PageLoader } from '../common/PageLoader'
import { formatEnum } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

function getStatusTone(status: string) {
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

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [report, setReport] = useState<ResearcherReport | null>(null)
  const [loading, setLoading] = useState(true)

  const [validationNotes, setValidationNotes] = useState('')
  const [validationSeverity, setValidationSeverity] = useState<Severity>('LOW')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!id) return

    api.get<ResearcherReport>(`/reports/${id}`).then((res) => {
      if (res.success) {
        setReport(res.data)
        if (res.data.vulnerabilities?.[0]) {
          setValidationSeverity(res.data.vulnerabilities[0].severity)
        }
        if (res.data.note) {
          setValidationNotes(res.data.note)
        }
      } else {
        showToast(res.error || 'Failed to load report', 'error')
        navigate('/reports')
      }
      setLoading(false)
    }).catch(() => {
      showToast('An error occurred while loading the report', 'error')
      navigate('/reports')
      setLoading(false)
    })
  }, [id, navigate, showToast])

  const handleValidation = async (action: ValidationAction) => {
    if (!report) return

    setIsSaving(true)
    try {
      const res = await api.post<ResearcherReport>(`/reports/${report.id}/validate`, {
        action,
        notes: validationNotes,
        severity: validationSeverity,
      })

      if (res.success) {
        setReport(res.data)
        showToast(`Report ${action.toLowerCase()}ed successfully`, 'success')
      } else {
        showToast(res.error || 'Validation failed', 'error')
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!report) return null

  const primaryVulnerability = report.vulnerabilities?.[0]
  const graphContext = report.structuredData?.graphContext
  const graphChips = [
    graphContext?.vulnerabilityClass,
    graphContext?.affectedAsset,
    graphContext?.affectedComponent,
    graphContext?.reporterAgent,
    ...(graphContext?.tags || []),
  ].filter(Boolean) as string[]

  const canValidate = user?.role === 'ADMIN' || (user?.role === 'ORGANIZATION' && report.program?.ownerId === user.id)
  const awaitingValidation = canValidate && ['AI_TRIAGED', 'TRIAGED', 'ESCALATED', 'SUBMITTED', 'LOW_EFFORT', 'NEEDS_INFO'].includes(report.status)

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 animate-fade-in">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-sm font-bold uppercase tracking-widest text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
          ← Back to list
        </button>
      </div>

      <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.4)] p-8 md:p-12 backdrop-blur-[20px]">
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="soft">{report.humanId}</Badge>
            {primaryVulnerability && (
              <Badge tone={getSeverityTone(primaryVulnerability.severity)}>
                Severity: {formatEnum(primaryVulnerability.severity)}
              </Badge>
            )}
            <Badge tone={getStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
            <Badge tone="soft">{formatEnum(report.source)}</Badge>
          </div>

          <h1 className="mt-6 font-serif text-5xl leading-tight text-[var(--text)]">{report.title}</h1>
          
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--text-soft)]">
            <button onClick={() => navigate(`/program/${report.programId}`)} className="font-bold text-[var(--accent-strong)] hover:underline">
              {report.programName || 'Program'}{report.programCode ? ` · ${report.programCode}` : ''}
            </button>
            <span>•</span>
            <span>Submitted by <span className="font-semibold text-[var(--text)]">{report.reporterName}</span></span>
            {report.decisionOwner && (
              <>
                <span>•</span>
                <span>Validator: <span className="font-semibold text-[var(--text)]">{report.decisionOwner}</span></span>
              </>
            )}
          </div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          <div className="space-y-12">
            {primaryVulnerability && (
              <section>
                <p className="section-kicker">Summary</p>
                <p className="mt-4 text-lg leading-relaxed text-[var(--text-soft)]">{primaryVulnerability.summary}</p>
              </section>
            )}

            {primaryVulnerability && (
              <section className="space-y-8">
                <div>
                  <p className="section-kicker">Impact</p>
                  <p className="mt-4 leading-relaxed text-[var(--text-soft)]">{primaryVulnerability.impact}</p>
                </div>
                <div>
                  <p className="section-kicker">Proof of Concept</p>
                  <div className="mt-4 rounded-2xl bg-[rgba(255,255,255,0.03)] p-6 whitespace-pre-line leading-relaxed text-[var(--text-soft)]">
                    {primaryVulnerability.proof}
                  </div>
                </div>
              </section>
            )}

            {primaryVulnerability && (primaryVulnerability.errorLocation || primaryVulnerability.codeSnippet) && (
              <section>
                <p className="section-kicker">Code Context</p>
                {primaryVulnerability.errorLocation && (
                  <div className="mt-4">
                    <Badge tone="soft">{primaryVulnerability.errorLocation}</Badge>
                  </div>
                )}
                {primaryVulnerability.codeSnippet && (
                  <pre className="mt-4 overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)] p-6 text-sm leading-6 text-[var(--text)]">
                    <code>{primaryVulnerability.codeSnippet}</code>
                  </pre>
                )}
              </section>
            )}

            {(graphChips.length > 0 || graphContext) && (
              <section className="border-t border-[rgba(255,255,255,0.06)] pt-12">
                <p className="section-kicker">Security Graph Context</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {graphChips.map((chip, idx) => (
                    <Badge key={idx} tone="soft">{chip}</Badge>
                  ))}
                </div>
                <div className="mt-8 grid gap-8 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Attack Vector</p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">{graphContext?.attackVector || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Root Cause</p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">{graphContext?.rootCause || 'Not specified'}</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-10">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
              <p className="section-kicker !text-[var(--accent-strong)]">Next Action</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">
                {report.nextAction || 'Awaiting manual triage or program update.'}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Submitted</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{formatDate(report.submittedAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Primary Target</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{primaryVulnerability?.target || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Route</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">{report.route}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">AI Score</p>
                <p className="mt-1 text-sm font-medium text-[var(--text)]">
                  {report.aiScore !== null && report.aiScore !== undefined ? report.aiScore.toFixed(1) : 'Not scored'}
                </p>
              </div>
            </div>

            {(report.aiSummary || report.note) && (
              <div className="space-y-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                {report.aiSummary && (
                  <div>
                    <p className="section-kicker">AI Analysis</p>
                    <p className="mt-3 text-xs leading-relaxed text-[var(--text-soft)]">{report.aiSummary}</p>
                  </div>
                )}
                {report.note && (
                  <div>
                    <p className="section-kicker">Internal Note</p>
                    <p className="mt-3 text-xs leading-relaxed text-[var(--text-soft)]">{report.note}</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {awaitingValidation && (
          <section className="mt-16 border-t border-[var(--accent)] pt-12">
            <p className="section-kicker !text-[var(--accent)]">Human Validation Action</p>
            
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Final Criticality</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setValidationSeverity(s as Severity)}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg border ${
                          validationSeverity === s
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-black'
                            : 'border-[rgba(255,255,255,0.1)] text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.05)]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 block">
                    Decision Notes
                  </label>
                  <textarea
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    className="w-full min-h-[120px] rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] p-4 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                    placeholder="Provide rationale for the reporter..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="primary" onClick={() => handleValidation('ACCEPT')} disabled={isSaving}>
                    {isSaving ? 'Processing...' : 'Accept Finding'}
                  </Button>
                  <Button variant="outline" onClick={() => handleValidation('ESCALATE')} disabled={isSaving}>
                    Escalate
                  </Button>
                  <Button variant="destructive" onClick={() => handleValidation('REJECT')} disabled={isSaving}>
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
