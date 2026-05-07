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
import { RewardClaimPanel } from '../rewards/RewardClaimPanel'
import { EscrowDeployPanel } from '../rewards/EscrowDeployPanel'

function getStatusTone(status: string) {
  switch (status) {
    case 'SUBMITTED': return 'new' as const
    case 'AI_TRIAGED': case 'TRIAGED': case 'NEEDS_INFO': return 'accent' as const
    case 'ACCEPTED': case 'RESOLVED': return 'success' as const
    case 'ESCALATED': return 'high' as const
    case 'LOW_EFFORT': case 'REJECTED': case 'DUPLICATE': return 'critical' as const
    default: return 'soft' as const
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
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

// ─── Syntax Highlighter ──────────────────────────────────────────────────────
function tokenize(raw: string): string {
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Comments
  s = s.replace(/(\/\/[^\n]*)/g, '<em style="color:#6e7681">$1</em>')
  // Strings
  s = s.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span style="color:#a5d6ff">$1</span>')
  // Keywords
  const kws = 'function|contract|if|else|for|while|return|mapping|address|uint256|uint|int|bool|bytes32|bytes|string|public|private|external|internal|view|pure|payable|virtual|override|modifier|event|emit|require|assert|revert|throw|new|delete|is|using|import|pragma|solidity|memory|storage|calldata|indexed'
  s = s.replace(new RegExp(`\\b(${kws})\\b`, 'g'), '<span style="color:#ff7b72;font-weight:600">$1</span>')
  // msg.*, block.*
  s = s.replace(/\b(msg|block|tx)\.(sender|value|data|gas|origin|timestamp|number|coinbase|chainid)\b/g, '<span style="color:#ffa657">$&</span>')
  // Numbers
  s = s.replace(/\b(\d+)\b/g, '<span style="color:#79c0ff">$1</span>')
  // Fn calls
  s = s.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span style="color:#d2a8ff">$1</span>')
  return s
}

function CodeViewer({ code, filename }: { code: string; filename?: string }) {
  const lines = code.trim().split('\n')
  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] max-w-full" style={{ fontFamily: '"IBM Plex Mono", "Fira Code", monospace', background: '#0d1117' }}>
      {/* Chrome bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]" style={{ background: '#161b22' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">{filename || 'vulnerability.sol'}</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#3fb950]">Solidity</span>
      </div>
      {/* Code */}
      <div className="flex overflow-x-auto">
        {/* Gutter */}
        <div className="flex-shrink-0 px-3 py-5 text-right select-none border-r border-[rgba(255,255,255,0.04)]" style={{ background: '#090c10', minWidth: 40 }}>
          {lines.map((_, i) => (
            <div key={i} className="text-[12px] leading-[1.6]" style={{ color: '#3d4451' }}>{i + 1}</div>
          ))}
        </div>
        {/* Content */}
        <pre className="flex-1 min-w-0 px-5 py-5 m-0 text-[12.5px] leading-[1.6] overflow-x-auto" style={{ background: 'transparent', color: '#e6edf3', whiteSpace: 'pre' }}>
          <code dangerouslySetInnerHTML={{ __html: tokenize(code.trim()) }} />
        </pre>
      </div>
    </div>
  )
}

// ─── Meta Row ─────────────────────────────────────────────────────────────────
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
        if (res.data.vulnerabilities?.[0]) setValidationSeverity(res.data.vulnerabilities[0].severity)
        if (res.data.note) setValidationNotes(res.data.note)
      } else {
        showToast(res.error || 'Failed to load report', 'error')
        navigate('/reports')
      }
      setLoading(false)
    }).catch(() => {
      showToast('An error occurred', 'error')
      navigate('/reports')
      setLoading(false)
    })
  }, [id, navigate, showToast])

  const handleValidation = async (action: ValidationAction) => {
    if (!report) return
    setIsSaving(true)
    try {
      const res = await api.post<ResearcherReport>(`/reports/${report.id}/validate`, {
        action, notes: validationNotes, severity: validationSeverity,
      })
      if (res.success) {
        setReport(res.data)
        showToast('Validation saved', 'success')
      } else {
        showToast(res.error || 'Validation failed', 'error')
      }
    } catch {
      showToast('Unexpected error', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!report) return null

  const vuln = report.vulnerabilities?.[0]
  const gc = report.structuredData?.graphContext
  const chips = [gc?.vulnerabilityClass, gc?.affectedAsset, gc?.affectedComponent, gc?.reporterAgent, ...(gc?.tags || [])].filter(Boolean) as string[]
  const canValidate = user?.role === 'ADMIN' || (user?.role === 'ORGANIZATION' && report.program?.ownerId === user.id)
  const awaitingValidation = canValidate && ['AI_TRIAGED', 'TRIAGED', 'ESCALATED', 'SUBMITTED', 'LOW_EFFORT', 'NEEDS_INFO'].includes(report.status)

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Breadcrumb row — matches ReportsPage pattern ─────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] hover:text-[var(--accent-strong)] transition-colors"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
          Back to Submissions
        </button>
        <div className="flex items-center gap-2">
          {vuln && <Badge tone={getSeverityTone(vuln.severity)}>Severity: {formatEnum(vuln.severity)}</Badge>}
          <Badge tone={getStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
        </div>
      </div>

      {/* ── Two-column layout — same pattern as the rest of the app ─────── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] items-start">

        {/* LEFT — main report body */}
        <div className="min-w-0 space-y-8">

          {/* Title block */}
          <div className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-6 py-8 backdrop-blur-[16px]">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[10px] font-black text-[var(--accent)] tracking-[0.3em] uppercase">{report.humanId}</span>
              <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
              <Badge tone="soft">{formatEnum(report.source)}</Badge>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl leading-[1.1] text-[var(--text)] mb-4" style={{ letterSpacing: '-0.02em' }}>
              {report.title}
            </h1>
            {vuln?.summary && (
              <p className="text-[var(--text-soft)] leading-relaxed text-base mt-2">
                {vuln.summary}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--text-soft)] border-t border-[rgba(255,255,255,0.04)] pt-5">
              <button onClick={() => navigate(`/program/${report.programId}`)} className="font-bold text-[var(--accent-strong)] hover:underline">
                {report.programName}{report.programCode ? ` · ${report.programCode}` : ''}
              </button>
              <span>·</span>
              <span>By <span className="font-semibold text-[var(--text)]">{report.reporterName}</span></span>
              <span>·</span>
              <span>{formatDate(report.submittedAt)}</span>
            </div>
          </div>

          {/* Impact */}
          {vuln?.impact && (
            <div className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-6 py-7 backdrop-blur-[16px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">Impact</p>
              <p className="text-[var(--text-soft)] leading-relaxed">{vuln.impact}</p>
            </div>
          )}

          {/* Proof of Concept + Code */}
          {vuln?.proof && (
            <div className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-6 py-7 backdrop-blur-[16px] space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-4">Proof of Concept</p>
                <p className="text-[var(--text-soft)] leading-relaxed text-sm">{vuln.proof}</p>
              </div>
              {(vuln.codeSnippet || vuln.errorLocation) && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Code Artifact</p>
                  <CodeViewer
                    code={vuln.codeSnippet || '// No snippet available'}
                    filename={vuln.errorLocation ?? undefined}
                  />
                </div>
              )}
            </div>
          )}

          {/* Security context */}
          {(chips.length > 0 || gc) && (
            <div className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-6 py-7 backdrop-blur-[16px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-5">Security Context</p>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {chips.map((c, i) => <Badge key={i} tone="soft">{c}</Badge>)}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">Attack Vector</p>
                  <p className="text-sm text-[var(--text-soft)] leading-relaxed">{gc?.attackVector || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">Root Cause</p>
                  <p className="text-sm text-[var(--text-soft)] leading-relaxed">{gc?.rootCause || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation panel */}
          {awaitingValidation && (
            <div className="rounded-[28px] border border-[rgba(15,202,138,0.2)] bg-[rgba(15,202,138,0.03)] px-6 py-7 backdrop-blur-[16px] space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Validation Decision</p>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">Set Severity</p>
                <div className="flex flex-wrap gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setValidationSeverity(s)}
                      className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg border-2 transition-all ${
                        validationSeverity === s
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-[#06080b]'
                          : 'border-[rgba(255,255,255,0.1)] text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.2)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] block mb-3">
                  Decision Notes
                </label>
                <textarea
                  value={validationNotes}
                  onChange={e => setValidationNotes(e.target.value)}
                  placeholder="Provide rationale for the reporter..."
                  className="w-full min-h-[120px] p-4 text-sm text-[var(--text)] rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] focus:border-[var(--accent)] focus:outline-none transition-colors resize-y"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => handleValidation('ACCEPT')} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Accept & Reward'}
                </Button>
                <Button variant="outline" onClick={() => handleValidation('ESCALATE')} disabled={isSaving}>Escalate</Button>
                <Button variant="destructive" onClick={() => handleValidation('REJECT')} disabled={isSaving}>Reject</Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sticky sidebar meta panel */}
        <aside className="lg:sticky lg:top-24 space-y-4">

          {/* Status / next action */}
          {report.nextAction && report.status !== 'REJECTED' && (
            <div className="rounded-[20px] border border-[rgba(15,202,138,0.15)] bg-[rgba(15,202,138,0.06)] px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-1.5">Next Action</p>
              <p className="text-sm text-[var(--text-soft)] leading-snug">
                {report.status === 'ACCEPTED' ? 'Reward distribution' : report.nextAction}
              </p>
            </div>
          )}

          {/* Core stats */}
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-5 py-5 backdrop-blur-[16px]">
            {/* AI score */}
            <div className="flex items-end justify-between pb-4 border-b border-[rgba(255,255,255,0.04)] mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">AI Score</p>
                <p className="text-3xl font-serif text-[var(--accent-strong)] leading-none">
                  {report.aiScore != null ? report.aiScore.toFixed(1) : '—'}
                </p>
              </div>
              {vuln && (
                <Badge tone={getSeverityTone(vuln.severity)}>{formatEnum(vuln.severity)}</Badge>
              )}
            </div>

            <MetaRow label="Program">
              <button
                onClick={() => navigate(`/program/${report.programId}`)}
                className="text-[13px] font-semibold text-[var(--accent-strong)] hover:underline"
              >
                {report.programName}{report.programCode ? ` · ${report.programCode}` : ''}
              </button>
            </MetaRow>

            <MetaRow label="Reporter">
              <span className="text-[13px] font-semibold text-[var(--text)]">{report.reporterName}</span>
            </MetaRow>

            <MetaRow label="Submitted">
              <span className="text-[12px] text-[var(--text-soft)]">{formatDate(report.submittedAt)}</span>
            </MetaRow>

            {vuln?.target && (
              <MetaRow label="Target">
                <span className="text-[11px] text-[var(--text-soft)] font-mono break-all">{vuln.target}</span>
              </MetaRow>
            )}

            {report.route && (
              <MetaRow label="Route">
                <span className="text-[12px] text-[var(--text-soft)]">{report.route}</span>
              </MetaRow>
            )}

            {report.decisionOwner && (
              <MetaRow label="Validator">
                <span className="text-[13px] font-semibold text-[var(--text)]">{report.decisionOwner}</span>
              </MetaRow>
            )}
          </div>

          {/* AI summary */}
          {report.aiSummary && (
            <div className="rounded-[20px] border border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)] px-5 py-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">AI Intelligence</p>
              <p className="text-[12px] text-[var(--text-soft)] leading-relaxed">{report.aiSummary}</p>
            </div>
          )}

          {/* ── Reward Panel — hunter claim or org escrow ───────────────── */}
          {(report.status === 'ACCEPTED' || report.status === 'RESOLVED') && (
            <RewardClaimPanel
              reportId={report.id}
              reportStatus={report.status}
              canClaim={user?.role === 'BOUNTY_HUNTER' && report.reporterId === user.id}
            />
          )}

          {/* Org Escrow Management */}
          {user?.role === 'ORGANIZATION' && report.program?.ownerId === user.id && (
            <EscrowDeployPanel userId={user.id} />
          )}
        </aside>
      </div>
    </div>
  )
}
