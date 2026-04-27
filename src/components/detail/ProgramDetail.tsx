import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Program, ProgramTab, ResearcherReport, ReportSnapshot, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Breadcrumbs } from '../common/Breadcrumbs'
import { Button } from '../common/Button'
import { ScopeTable } from './ScopeTable'
import { getScopeTargetContextChips, getScopeTargetReference } from '../../utils/scopeTargets'
import { formatEnum, formatUsd } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'

interface ProgramDetailProps {
  program: Program
  submissionCount: number
  viewerReports?: readonly ResearcherReport[]
  viewerName?: string | null
  hasPendingSubmission?: boolean
  onBack: () => void
  onStartSubmission: () => void
  onViewResponses?: () => void
  onOpenAgent?: (agentId: string) => void
  onLogin?: () => void
  initialTab?: ProgramTab
  detailPath?: string
}

type VisibleTab = 'overview' | 'scope'

const tabMeta: { id: VisibleTab; label: string }[] = [
  { id: 'overview', label: 'Instructions' },
  { id: 'scope', label: 'Scope' },
]

const severityToneMap: Record<Severity, 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

const severityOrder: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const severityDotMap: Record<Severity, string> = {
  CRITICAL: 'bg-[var(--critical-text)]',
  HIGH: 'bg-[var(--warning-text)]',
  MEDIUM: 'bg-[#ffd487]',
  LOW: 'bg-[var(--success-text)]',
}

const accentColorMap: Record<string, string> = {
  mint: '#1eba98',
  violet: '#7d7bf2',
  orange: '#ff9f43',
  ink: '#84b8ff',
  blue: '#4ea8ff',
  rose: '#ff7f96',
}

const heroSurfaceClass = 'relative overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.045)] bg-[linear-gradient(145deg,rgba(13,25,34,0.48),rgba(9,16,24,0.32))] shadow-[0_12px_36px_rgba(0,0,0,0.08)] backdrop-blur-[14px]'
const panelSurfaceClass = 'rounded-[28px] border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(145deg,rgba(13,25,34,0.4),rgba(9,16,24,0.24))] shadow-[0_10px_28px_rgba(0,0,0,0.08)] backdrop-blur-[14px]'
const insetSurfaceClass = 'rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[rgba(7,12,18,0.22)] backdrop-blur-[10px]'

function normalizeTab(tab: ProgramTab): VisibleTab {
  return tab === 'scope' ? 'scope' : 'overview'
}

function getScrollTarget(tab: ProgramTab) {
  if (tab === 'submission') return 'submit-guidance'
  if (tab === 'triage') return 'report-triage'
  if (tab === 'policy') return 'reward-tiers'
  return null
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No update yet'

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function sortReportsDescending<T extends { submittedAt: string }>(reports: readonly T[]) {
  return [...reports].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
}

function getReportStatusTone(status: string) {
  if (['ACCEPTED', 'RESOLVED'].includes(status)) return 'success' as const
  if (['AI_TRIAGED', 'TRIAGED', 'NEEDS_INFO'].includes(status)) return 'accent' as const
  if (status === 'ESCALATED') return 'high' as const
  if (['REJECTED', 'LOW_EFFORT', 'DUPLICATE'].includes(status)) return 'critical' as const
  return 'soft' as const
}

function DetailSection({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="content-auto contain-paint border-t border-[var(--border)] pt-8 first:border-t-0 first:pt-0">
      <div className="max-w-4xl">
        <h2 className="text-[clamp(1.6rem,2.5vw,2.25rem)] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {subtitle ? <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{subtitle}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function DetailList({ items, emptyText }: { items: readonly string[]; emptyText?: string }) {
  if (!items.length) {
    return <p className="text-sm leading-7 text-[var(--text-soft)]">{emptyText || 'Nothing added yet.'}</p>
  }

  return (
    <ul className="space-y-3 text-sm leading-7 text-[var(--text-soft)]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function DataTable({ headers, rows }: { headers: readonly string[]; rows: readonly ReactNode[][] }) {
  return (
    <div className="content-auto overflow-x-auto border-y border-[var(--border)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold first:pl-0 last:pr-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[var(--border)] last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-4 align-top text-[var(--text-soft)] first:pl-0 last:pr-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-[var(--text-soft)] whitespace-nowrap">{label}</span>
      <span className="text-right font-medium text-[var(--text)]">{value}</span>
    </div>
  )
}

function ReportList({ reports }: { reports: readonly ReportSnapshot[] }) {
  if (!reports.length) {
    return <p className="text-sm leading-7 text-[var(--text-soft)]">No public findings yet.</p>
  }

  return (
    <div className="content-auto divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {reports.map((report) => (
        <article key={report.id} className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={severityToneMap[report.severity]}>{formatEnum(report.severity)}</Badge>
                <Badge tone={getReportStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                <Badge tone="soft">{report.humanId}</Badge>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text)]">{report.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{report.note || report.route}</p>
            </div>

            <div className="text-left md:min-w-[190px] md:text-right">
              {report.rewardEstimateUsd ? (
                <p className="text-lg font-semibold text-[var(--text)]">{formatUsd(report.rewardEstimateUsd)}</p>
              ) : (
                <p className="text-sm font-medium text-[var(--text)]">In review</p>
              )}
              <p className="mt-1 text-xs text-[var(--text-soft)]">{formatDateTime(report.submittedAt)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export function ProgramDetail({
  program,
  submissionCount,
  viewerReports = [],
  viewerName,
  hasPendingSubmission = false,
  onBack,
  onStartSubmission,
  onViewResponses,
  onLogin,
  initialTab = 'overview',
  detailPath,
}: ProgramDetailProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<VisibleTab>(normalizeTab(initialTab))

  const focusArea = useMemo(
    () => (program.policySections || []).find((section) => section.title === 'Focus Area'),
    [program.policySections],
  )
  const outOfScope = useMemo(
    () => (program.policySections || []).find((section) => section.title === 'Out Of Scope'),
    [program.policySections],
  )
  const programRules = useMemo(
    () => (program.policySections || []).find((section) => section.title === 'Program Rules'),
    [program.policySections],
  )
  const disclosureGuidelines = useMemo(
    () => (program.policySections || []).find((section) => section.title === 'Disclosure Guidelines'),
    [program.policySections],
  )
  const eligibility = useMemo(
    () => (program.policySections || []).find((section) => section.title === 'Eligibility And Coordinated Disclosure'),
    [program.policySections],
  )

  const rewardTiers = useMemo(
    () => [...(program.rewardTiers || [])].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]),
    [program.rewardTiers],
  )
  const sortedQueue = useMemo(() => sortReportsDescending(program.reports || []), [program.reports])
  const recentPublicSubmissions = useMemo(() => sortedQueue.slice(0, 5), [sortedQueue])
  const sortedViewerReports = useMemo(() => sortReportsDescending(viewerReports), [viewerReports])
  const latestViewerReport = sortedViewerReports[0]
  const scopeTargets = program.scopeTargets || []
  const scopeReferences = useMemo(() => scopeTargets.filter((target) => Boolean(target.referenceUrl)), [scopeTargets])
  const whatWeLookFor = focusArea?.items?.length ? focusArea.items : program.summaryHighlights || []
  const disclosureItems = useMemo(
    () => [...(disclosureGuidelines?.items || []), ...(eligibility?.items || [])],
    [disclosureGuidelines?.items, eligibility?.items],
  )
  const proofItems = useMemo(
    () => [
      program.pocRequired
        ? 'Include a functional proof of concept or a replayable exploit path so the team can validate the issue quickly.'
        : 'A proof of concept is strongly encouraged because it helps the team validate the issue faster.',
      ...program.submissionChecklist,
      ...(program.evidenceFields || []).map((field) => `${field.name.replace(/_/g, ' ')}: ${field.description}`),
    ],
    [program.evidenceFields, program.pocRequired, program.submissionChecklist],
  )
  const summaryCount = useMemo(() => Math.max(submissionCount, sortedQueue.length), [submissionCount, sortedQueue.length])

  const payoutRows: ReactNode[][] = useMemo(
    () =>
      rewardTiers.map((tier) => [
        <div className="flex items-center gap-2" key={`${tier.severity}-label`}>
          <span className={`h-2.5 w-2.5 rounded-full ${severityDotMap[tier.severity]}`} />
          <span className="font-medium text-[var(--text)]">{formatEnum(tier.severity)}</span>
        </div>,
        <span key={`${tier.severity}-reward`} className="font-medium text-[var(--text)]">{formatUsd(tier.maxRewardUsd)}</span>,
        tier.triageSla,
        <div key={`${tier.severity}-examples`} className="space-y-1">
          {tier.examples.map((example) => (
            <div key={example}>{example}</div>
          ))}
        </div>,
      ]),
    [rewardTiers],
  )

  const classificationRows: ReactNode[][] = useMemo(
    () =>
      rewardTiers.map((tier) => [
        <span key={`${tier.severity}-level`} className="font-medium text-[var(--text)]">{formatEnum(tier.severity)}</span>,
        <span key={`${tier.severity}-cap`} className="font-medium text-[var(--text)]">{formatUsd(tier.maxRewardUsd)}</span>,
        <div key={`${tier.severity}-scope-examples`} className="space-y-1">
          {tier.examples.map((example) => (
            <div key={example}>{example}</div>
          ))}
        </div>,
      ]),
    [rewardTiers],
  )

  const isOrganization = user?.role === 'ORGANIZATION' || user?.role === 'ADMIN'
  const primaryActionLabel = isOrganization ? 'View applications' : hasPendingSubmission ? 'Waiting for response' : 'Submit report'
  const primaryActionTone = hasPendingSubmission && !isOrganization ? 'secondary' : 'primary'
  const ctaLabel = !user ? 'Log in' : primaryActionLabel
  const liveLabel = program.status === 'ACTIVE' ? 'Live' : formatEnum(program.status)

  useEffect(() => {
    const nextTab = normalizeTab(initialTab)
    setActiveTab(nextTab)

    const scrollTarget = getScrollTarget(initialTab)
    if (!scrollTarget) return

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(scrollTarget)?.scrollIntoView({ block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [initialTab, program.id])

  const handlePrimaryAction = () => {
    if (!user && onLogin) {
      onLogin()
      return
    }

    if ((isOrganization || hasPendingSubmission) && onViewResponses) {
      onViewResponses()
      return
    }

    onStartSubmission()
  }

  const handleTabChange = (tab: VisibleTab) => {
    setActiveTab(tab)

    if (detailPath && window.history) {
      window.history.replaceState(null, '', detailPath)
    }

    window.scrollTo({ top: 0, left: 0 })
  }

  const openSubmissionGuide = () => {
    if (detailPath) {
      navigate(detailPath)
    }

    setActiveTab('overview')
    window.requestAnimationFrame(() => {
      document.getElementById('submit-guidance')?.scrollIntoView({ block: 'start' })
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Bounties', onClick: onBack },
          { label: program.name },
        ]}
      />

      <section className={heroSurfaceClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,202,138,0.08),transparent_44%),radial-gradient(circle_at_82%_18%,rgba(77,159,255,0.06),transparent_34%)]" />
        <div className="absolute inset-y-0 right-[18%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.035),transparent)] xl:block" />

        <div className="relative border-b border-[rgba(255,255,255,0.05)] px-6 py-7 md:px-8 md:py-9 xl:px-10 xl:py-10">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
            <div className="flex min-w-0 items-start gap-4 md:gap-5">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.08)] text-xl font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                style={{ backgroundColor: accentColorMap[program.accentTone.toLowerCase()] || '#1eba98' }}
              >
                {program.logoMark}
              </div>

              <div className="min-w-0">
                <p className="text-sm text-[var(--text-soft)]">{program.company}</p>
                <h1 className="mt-2 font-['Fraunces',serif] text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-none tracking-tight text-[var(--text)]">
                  {program.name}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-soft)] md:text-lg">{program.tagline}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Badge tone="accent" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                    {formatEnum(program.kind)}
                  </Badge>
                  <Badge tone="success" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                    {liveLabel}
                  </Badge>
                  <Badge tone="soft" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                    {program.code}
                  </Badge>
                </div>
              </div>
            </div>

            <div className={`${insetSurfaceClass} content-auto contain-paint p-5 xl:ml-auto xl:w-full xl:max-w-[280px]`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Quick facts</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--text-soft)] whitespace-nowrap">Started</span>
                  <span className="font-medium text-[var(--text)] whitespace-nowrap">{formatDate(program.startedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--text-soft)] whitespace-nowrap">Response SLA</span>
                  <span className="font-medium text-[var(--text)] text-right">{program.responseSla}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--text-soft)] whitespace-nowrap">Payout window</span>
                  <span className="font-medium text-[var(--text)] text-right">{program.payoutWindow}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="relative px-6 md:px-8 xl:px-10">
          <div className="flex gap-6 overflow-x-auto">
            {tabMeta.map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={[
                    'border-b-2 px-1 pb-3 pt-4 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-[var(--accent)] text-[var(--text)]'
                      : 'border-transparent text-[var(--text-soft)] hover:text-[var(--text)]',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-8">
          {activeTab === 'overview' ? (
            <>
              <DetailSection
                title="What We're Looking For"
                subtitle="This page now behaves more like a document and less like a dashboard so the instructions are faster to read and lighter to render."
              >
                <DetailList items={whatWeLookFor} />
              </DetailSection>

              <DetailSection title="What We're Not Looking For">
                <DetailList items={outOfScope?.items || []} emptyText="No public out-of-scope list yet." />
              </DetailSection>

              <DetailSection title="Program Rules">
                <DetailList items={programRules?.items || []} emptyText="No additional rules have been published yet." />
              </DetailSection>

              <DetailSection title="Disclosure Requirements">
                <DetailList items={disclosureItems.length > 0 ? disclosureItems : [program.disclosureModel]} />
              </DetailSection>

              <DetailSection id="submit-guidance" title="Proof Of Concept Requirements">
                <DetailList items={proofItems} />
              </DetailSection>

              <DetailSection title="How To Submit">
                <p className="max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                  Submit through the AuditPal flow with a clear narrative, exact target, impact, and enough detail for the team to reproduce the issue quickly.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant={primaryActionTone} size="md" onClick={handlePrimaryAction}>
                    {ctaLabel}
                  </Button>
                  <Button variant="outline" size="md" onClick={onBack}>
                    Back to bounties
                  </Button>
                </div>
              </DetailSection>

              <DetailSection id="report-triage" title="Report Triage">
                {(program.triageStages || []).length > 0 ? (
                  <div className="content-auto divide-y divide-[var(--border)] border-y border-[var(--border)]">
                    {(program.triageStages || []).map((stage, index) => (
                      <article key={stage.title} className="grid gap-4 py-5 md:grid-cols-[72px_minmax(0,1fr)_220px] md:items-start">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Step {index + 1}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--text)]">{stage.title}</h3>
                          <p className="mt-1 text-sm text-[var(--text-soft)]">{stage.owner}</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{stage.trigger}</p>
                          {stage.outputs.length > 0 ? (
                            <ul className="mt-4 space-y-2 text-sm text-[var(--text-soft)]">
                              {stage.outputs.map((output) => (
                                <li key={output} className="flex items-start gap-3">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                                  <span>{output}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <div className="space-y-3 md:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Automation</p>
                          <p className="text-sm text-[var(--text)]">{stage.automation}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Human check</p>
                          <p className="text-sm leading-7 text-[var(--text-soft)]">{stage.humanGate}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--text-soft)]">The triage workflow has not been published yet.</p>
                )}
              </DetailSection>

              <DetailSection id="reward-tiers" title="Payout Overview">
                <p className="max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                  Reward bands below are based on the public severity matrix for this program. Final decisions still depend on confirmed impact, reproducibility, and scope fit.
                </p>
                <div className="mt-6">
                  <DataTable
                    headers={['Severity', 'Max Reward', 'Triage Target', 'Typical Examples']}
                    rows={payoutRows}
                  />
                </div>
              </DetailSection>

              <DetailSection title="Latest Public Findings">
                <ReportList reports={recentPublicSubmissions} />
              </DetailSection>
            </>
          ) : (
            <>
              <DetailSection
                title="In-Scope Targets"
                subtitle="Targets are shown in a flatter list so the scope is easier to scan and the page feels lighter while you scroll."
              >
                <ScopeTable targets={scopeTargets} />
              </DetailSection>

              <DetailSection title="Scope Snapshot">
                <div className="content-auto divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  <MetricRow label="Categories" value={program.categories.map((item) => formatEnum(item)).join(', ') || 'Not specified'} />
                  <MetricRow label="Platforms" value={program.platforms.map((item) => formatEnum(item)).join(', ') || 'Not specified'} />
                  <MetricRow label="Languages" value={program.languages.map((item) => formatEnum(item)).join(', ') || 'Not specified'} />
                  <MetricRow label="Targets" value={scopeTargets.length} />
                  <MetricRow label="Public references" value={scopeReferences.length} />
                </div>
              </DetailSection>

              <DetailSection title="Severity / Reward Bands">
                <DataTable headers={['Severity', 'Maximum Reward', 'Example Classes']} rows={classificationRows} />
              </DetailSection>

              <DetailSection title="Target Notes">
                <div className="content-auto divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {scopeTargets.map((target) => (
                    <article key={target.id} className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-[var(--text)]">{target.label}</h3>
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                            <span className={`h-2 w-2 rounded-full ${severityDotMap[target.severity]}`} />
                            {formatEnum(target.severity)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{target.note}</p>
                        {getScopeTargetContextChips(target).length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {getScopeTargetContextChips(target).map((chip) => (
                              <span key={`${target.id}-${chip}`} className="border border-[var(--border)] px-2 py-1">
                                {formatEnum(chip)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Location</p>
                          <p className="mt-1 text-[var(--text)]">{target.location}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Reference</p>
                          {target.referenceUrl ? (
                            <a
                              href={target.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block break-all text-[var(--accent-strong)] transition hover:text-[var(--text)]"
                            >
                              {getScopeTargetReference(target)}
                            </a>
                          ) : (
                            <p className="mt-1 text-[var(--text)]">{getScopeTargetReference(target)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Review status</p>
                          <p className="mt-1 text-[var(--text)]">{target.reviewStatus}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title="References">
                {scopeReferences.length > 0 ? (
                  <div className="content-auto divide-y divide-[var(--border)] border-y border-[var(--border)]">
                    {scopeReferences.map((target) => (
                      <a
                        key={target.id}
                        href={target.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block py-4 text-sm leading-7 text-[var(--accent-strong)] transition hover:text-[var(--text)]"
                      >
                        <span className="font-medium text-[var(--text)]">{target.label}</span>
                        <span className="text-[var(--text-soft)]">{' '}· {target.referenceUrl}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--text-soft)]">No public references have been added yet.</p>
                )}
              </DetailSection>
            </>
          )}
        </div>

        <aside className="space-y-8 xl:sticky xl:top-28 xl:self-start">
          <section className={`${panelSurfaceClass} content-auto contain-paint p-6`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Program summary</p>
            <p className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">Maximum reward in {program.payoutCurrency}</p>

            <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {rewardTiers.map((tier) => (
                <div key={tier.severity} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${severityDotMap[tier.severity]}`} />
                    <span className="text-[var(--text)]">{formatEnum(tier.severity)}</span>
                  </div>
                  <span className="font-medium text-[var(--text)]">{formatUsd(tier.maxRewardUsd)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <MetricRow label="Proof required" value={program.pocRequired ? 'Yes' : 'No'} />
              <MetricRow label="Findings submitted" value={summaryCount} />
              <MetricRow label="Start date" value={formatDate(program.startedAt)} />
              <MetricRow label="Response SLA" value={program.responseSla} />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button variant={primaryActionTone} size="lg" className="w-full" onClick={handlePrimaryAction}>
                {ctaLabel}
              </Button>
              <Button variant="ghost" size="md" className="w-full justify-center" onClick={onBack}>
                Back to bounties
              </Button>
            </div>

            {!user && onLogin ? (
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">Sign in as a researcher to join this bounty.</p>
            ) : null}
          </section>

          {latestViewerReport ? (
            <section className={`${panelSurfaceClass} content-auto contain-paint p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Your latest submission</p>
              <p className="mt-4 text-lg font-semibold text-[var(--text)]">{viewerName || latestViewerReport.reporterName}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{latestViewerReport.humanId}</p>

              <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                <MetricRow
                  label="Status"
                  value={<Badge tone={getReportStatusTone(latestViewerReport.status)}>{formatEnum(latestViewerReport.status)}</Badge>}
                />
                <MetricRow label="Updated" value={formatDateTime(latestViewerReport.updatedAt || latestViewerReport.submittedAt)} />
              </div>

              <Button variant="outline" size="md" className="mt-5 w-full" onClick={openSubmissionGuide}>
                Review submission guidance
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
