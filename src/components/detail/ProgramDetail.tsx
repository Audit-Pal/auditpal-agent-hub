import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Program, ProgramTab, ReportSnapshot, ResearcherReport } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Breadcrumbs } from '../common/Breadcrumbs'
import { Button } from '../common/Button'
import { MetricCard } from '../common/MetricCard'
import { QueueSnapshot } from './QueueSnapshot'
import { RewardMatrix } from './RewardMatrix'
import { ScopeTable } from './ScopeTable'
import { TriageVisualizer } from './TriageVisualizer'
import { getScopeTargetContextChips, getScopeTargetReference } from '../../utils/scopeTargets'
import { formatEnum, formatUsd } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import type { Agent } from '../../types/platform'

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
  initialTab?: ProgramTab
  detailPath?: string
}

interface SectionLink {
  id: string
  label: string
  hint: string
}

interface ProgramParticipant {
  id: string
  name: string
  logoMark: string
  headline: string
  purpose: string
  trigger: string
  latestTimestamp: string | null
  recentTitle: string | null
}

const accentColorMap: Record<string, string> = {
  mint: '#3f7d5b',
  violet: '#6f6a93',
  orange: '#9d5a17',
  ink: '#403b35',
  blue: '#3d6b8c',
  rose: '#965c64',
}

const tabMeta: { id: ProgramTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'scope', label: 'Resources' },
  { id: 'submission', label: 'Submission' },
  { id: 'triage', label: 'Review Flow' },
  { id: 'policy', label: 'Rules' },
]

const sectionLinksByTab: Record<ProgramTab, SectionLink[]> = {
  overview: [
    { id: 'overview-summary', label: 'Overview', hint: 'Brief' },
    { id: 'overview-task', label: 'The Task', hint: 'Focus area' },
    { id: 'overview-tracks', label: 'Tracks', hint: 'Chains and assets' },
    { id: 'overview-evaluation', label: 'Evaluation', hint: 'How it is judged' },
    { id: 'overview-timeline', label: 'Timeline', hint: 'Steps and schedule' },
  ],
  scope: [
    { id: 'scope-targets', label: 'Scope', hint: 'In-scope targets' },
    { id: 'scope-notes', label: 'Asset Notes', hint: 'Context and status' },
    { id: 'scope-evidence', label: 'Evidence', hint: 'Required bundle' },
    { id: 'scope-resources', label: 'References', hint: 'Links and repos' },
  ],
  submission: [
    { id: 'submission-readiness', label: 'How To Submit', hint: 'Required path' },
    { id: 'submission-agents', label: 'Agent Selection', hint: 'Choose before form' },
    { id: 'submission-latest', label: 'Latest Activity', hint: 'Top 5 latest submissions' },
    { id: 'submission-payouts', label: 'Past Payouts', hint: 'Historic payment context' },
    { id: 'submission-api', label: 'API', hint: 'Programmatic submission' },
  ],
  triage: [
    { id: 'triage-flow', label: 'Review Flow', hint: 'Stages and gates' },
    { id: 'triage-queue', label: 'Queue', hint: 'Public submission snapshot' },
    { id: 'triage-agents', label: 'Agents', hint: 'Who participates here' },
  ],
  policy: [
    { id: 'policy-rewards', label: 'Rewards', hint: 'Severity matrix' },
    { id: 'policy-rules', label: 'Rules', hint: 'Program policy' },
    { id: 'policy-duplicates', label: 'Duplicates', hint: 'Collision policy' },
    { id: 'policy-disclosure', label: 'Disclosure', hint: 'Communication rules' },
  ],
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
  if (!value) return 'No timestamp yet'

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

function getSeverityTone(severity: string) {
  if (severity === 'CRITICAL') return 'critical' as const
  if (severity === 'HIGH') return 'high' as const
  if (severity === 'MEDIUM') return 'medium' as const
  return 'low' as const
}

function getReportStatusTone(status: string) {
  if (['ACCEPTED', 'RESOLVED'].includes(status)) return 'success' as const
  if (['AI_TRIAGED', 'TRIAGED', 'NEEDS_INFO'].includes(status)) return 'accent' as const
  if (status === 'ESCALATED') return 'high' as const
  if (['REJECTED', 'LOW_EFFORT', 'DUPLICATE'].includes(status)) return 'critical' as const
  return 'soft' as const
}

function buildSubmissionExample(program: Program) {
  const primaryTarget = (program.scopeTargets || [])[0]
  const repoLinks = (program.scopeTargets || [])
    .filter((target) => Boolean(target.referenceUrl) && target.referenceKind?.includes('GITHUB'))
    .map((target) => target.referenceUrl!)

  return {
    programId: program.id,
    reporterName: 'Demo Bounty Hunter',
    title: 'Stale approval cache survives policy rotation',
    severity: 'HIGH',
    target: primaryTarget?.label || program.name,
    summary:
      'The cached approval path is not invalidated when policy state changes, which allows a previously valid signer bundle to continue passing a restricted execution branch.',
    impact:
      'An attacker with a captured or previously authorized bundle can continue executing privileged flow after the bounty owner intended that path to be revoked.',
    proof:
      'Replay the policy update, reuse the old signer bundle, and observe that the protected action still executes even though the policy should now reject it.',
    source: 'CROWD_REPORT',
    errorLocation:
      primaryTarget?.referenceKind === 'SOURCE_FILE'
        ? primaryTarget.referenceValue || 'contracts/core/PolicyGate.sol:88-120'
        : 'contracts/core/PolicyGate.sol:88-120',
    codeSnippet: 'if (approvalCache[hash]) { return true; }',
    graphContext: {
      reporterAgent: 'hunter-scout-v1',
      vulnerabilityClass: 'Authorization bypass',
      affectedAsset: program.name,
      affectedComponent: primaryTarget?.label || 'Policy gate',
      attackVector: 'Reuse an approval path that should have been revoked after the bounty policy changed.',
      rootCause: 'Approval cache entries are not invalidated when signer or policy state changes.',
      prerequisites: 'Access to a previously valid approval bundle or signed payload.',
      referenceIds: ['bundle-01'],
      transactionHashes: [],
      contractAddresses:
        primaryTarget?.referenceKind === 'CONTRACT_ADDRESS' && primaryTarget.referenceValue
          ? [primaryTarget.referenceValue]
          : [],
      repositoryLinks: repoLinks,
      filePaths: ['contracts/core/PolicyGate.sol'],
      tags: ['authorization', 'cache-invalidation', 'replayable'],
    },
  }
}

function sortReportsDescending<T extends { submittedAt: string }>(reports: readonly T[]) {
  return [...reports].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
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
  onOpenAgent,
  initialTab = 'overview',
  detailPath,
}: ProgramDetailProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ProgramTab>(initialTab)
  const [activeSection, setActiveSection] = useState<string>(sectionLinksByTab[initialTab][0]?.id ?? '')
  const [isManualScroll, setIsManualScroll] = useState(false)
  const [ownedAgents, setOwnedAgents] = useState<Agent[]>([])
  const [isLoadingOwnedAgents, setIsLoadingOwnedAgents] = useState(false)

  const accentColor = accentColorMap[program.accentTone?.toLowerCase()] || '#171717'
  const focusArea = (program.policySections || []).find((section) => section.title === 'Focus Area')
  const policySections = (program.policySections || []).filter((section) => section.title !== 'Focus Area')
  const primaryTarget = (program.scopeTargets || [])[0]
  const scopeReferences = (program.scopeTargets || []).filter((target) => Boolean(target.referenceUrl))
  const sortedQueue = sortReportsDescending(program.reportQueue || [])
  const recentPublicSubmissions = sortedQueue.slice(0, 5)
  const payoutHistory = sortedQueue
    .filter((report) => ['ACCEPTED', 'RESOLVED'].includes(report.status) || (report.rewardEstimateUsd || 0) > 0)
    .slice(0, 5)
  const sortedViewerReports = sortReportsDescending(viewerReports)
  const latestViewerReport = sortedViewerReports[0]
  const submissionExample = buildSubmissionExample(program)
  const submissionPayload = JSON.stringify(submissionExample, null, 2)
  const apiKeyGenerationCommand = `curl -X POST http://localhost:3001/api/v1/auth/api-key \\
  -H "Authorization: Bearer <hunter_access_token>"`
  const guideSections = sectionLinksByTab[activeTab]
  const participationSteps = [
    'Open the submission panel, select the assisting agent first, then complete the structured report fields.',
    'Attach a replayable narrative with summary, impact, proof, exact target, and any code or environment references.',
    'Submit from the UI or automate the same payload through the Hunter Submission API with your platform API key.',
    'Track status changes in the report center while AI triage and the organization reviewer process your report.',
  ]
  const submissionFormat = [
    {
      title: 'Finding narrative',
      body: 'Include title, severity, target, summary, impact, and replay proof. This is the core report bounty reviewers evaluate first.',
    },
    {
      title: 'Agent-assisted context',
      body: 'Select the agent used for this submission before sending the report so the bounty team can see which workflow assisted your analysis.',
    },
    {
      title: 'Evidence bundle',
      body: 'Attach repositories, addresses, file paths, snippets, and error locations when available so the finding is reproducible.',
    },
    {
      title: 'History and payout context',
      body: 'Review the latest public submissions and payout history on this page before submitting to understand how this campaign responds and pays.',
    },
  ]
  const postSubmissionStates = [
    {
      label: '1. Low-effort filter',
      body: 'Thin or placeholder reports are marked LOW_EFFORT and routed back with guidance to strengthen impact and proof.',
    },
    {
      label: '2. AI triage',
      body: 'Structured reports receive an AI score, summary, queue route, and next action before they reach a person.',
    },
    {
      label: '3. Human validation',
      body: 'The bounty owner or organization validator can ACCEPT, REJECT, or ESCALATE the report from the triaged queue.',
    },
    {
      label: '4. Response tracking',
      body: 'If you already have a live submission here, the primary action changes to Waiting for response until the campaign answers.',
    },
  ]

  const participantAgents: ProgramParticipant[] = (program.linkedAgents || [])
    .map((link) => {
      const recentExecution =
        link.agent?.recentExecutions?.find((execution) => execution.programId === program.id) ||
        link.agent?.recentExecutions?.[0]

      return {
        id: link.agentId,
        name: link.agent?.name || 'Linked agent',
        logoMark: link.agent?.logoMark || 'AG',
        headline: link.agent?.headline || link.purpose,
        purpose: link.purpose,
        trigger: link.trigger,
        latestTimestamp: recentExecution?.timestamp ?? null,
        recentTitle: recentExecution?.title ?? null,
      }
    })
    .sort((left, right) => (right.latestTimestamp || '').localeCompare(left.latestTimestamp || ''))

  const visibleParticipants = participantAgents.slice(0, 5)
  const primaryActionLabel = hasPendingSubmission ? 'Waiting for response' : 'Submit report'
  const primaryActionTone = hasPendingSubmission ? 'secondary' : 'primary'

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, program.id])

  useEffect(() => {
    if (!user) {
      setOwnedAgents([])
      setIsLoadingOwnedAgents(false)
      return
    }

    let cancelled = false
    setIsLoadingOwnedAgents(true)

    api.get<Agent[]>('/agents/mine')
      .then((res) => {
        if (cancelled) return
        setOwnedAgents(res.success ? res.data : [])
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to fetch hunter agents for submission tab', error)
          setOwnedAgents([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOwnedAgents(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    setActiveSection(sectionLinksByTab[activeTab][0]?.id ?? '')
  }, [activeTab])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll) return

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    )

    const sections = sectionLinksByTab[activeTab]
    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [activeTab, isManualScroll])

  const openSubmissionGuide = () => {
    if (detailPath) {
      navigate(detailPath + '/submission')
      return
    }

    setActiveTab('submission')
  }

  const handleTabChange = (tab: ProgramTab) => {
    setActiveTab(tab)

    if (!detailPath) return

    if (tab === 'submission') {
      navigate(detailPath + '/submission')
      return
    }

    if (initialTab === 'submission') {
      navigate(detailPath)
    }
  }

  const handlePrimaryAction = () => {
    if (hasPendingSubmission && onViewResponses) {
      onViewResponses()
      return
    }

    onStartSubmission()
  }

  const jumpToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    setIsManualScroll(true)
    const target = document.getElementById(sectionId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setTimeout(() => setIsManualScroll(false), 1000)
  }

  const renderSubmissionCards = (reports: readonly ReportSnapshot[]) => {
    if (reports.length === 0) {
      return (
        <div className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5 text-sm leading-7 text-[#4b463f]">
          No public submission snapshots are available for this bounty yet.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={report.id} className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="soft">{report.humanId}</Badge>
                  <Badge tone={getSeverityTone(report.severity)}>{formatEnum(report.severity)}</Badge>
                  <Badge tone={getReportStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                </div>
                <h4 className="mt-4 text-xl font-semibold text-[#171717]">{report.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">{report.note || report.route}</p>
              </div>

              <div className="min-w-[220px] rounded-[22px] border border-[#e6dfd3] bg-white p-4 text-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Submitted</p>
                <p className="mt-2 text-[#171717]">{formatDateTime(report.submittedAt)}</p>
                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Route</p>
                <p className="mt-2 text-[#171717]">{report.route}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Bounties', onClick: onBack },
          { label: program.name },
        ]}
      />

      <section className="overflow-hidden rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] shadow-[0_24px_80px_rgba(30,24,16,0.08)]">
        <div
          className="border-b border-[#ebe4d8] px-6 py-8 md:px-8 md:py-10"
          style={{
            background: `linear-gradient(135deg, ${accentColor}12, rgba(255,253,248,0.94) 46%, rgba(255,253,248,1) 100%)`,
          }}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_320px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="soft">{formatEnum(program.kind)}</Badge>
                <Badge tone="accent">{program.triagedLabel}</Badge>
                <Badge tone="soft">Bounty code {program.code}</Badge>
                <Badge tone="soft">Updated {formatDate(program.updatedAt)}</Badge>
              </div>

              <div className="flex items-start gap-5">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-[26px] border text-2xl font-semibold text-[#171717]"
                  style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}14` }}
                >
                  {program.logoMark}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                    {program.company}
                  </p>
                  <h1 className="mt-3 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
                    {program.name}
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4b463f]">{program.tagline}</p>
                </div>
              </div>

              <p className="max-w-4xl text-base leading-8 text-[#5f5a51]">{program.description}</p>

              <div className="flex flex-wrap gap-2">
                {(program.platforms || []).map((platform) => (
                  <Badge key={platform} tone="soft">
                    {formatEnum(platform)}
                  </Badge>
                ))}
                {(program.languages || []).map((language) => (
                  <Badge key={language} tone="soft">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>

            <aside className="rounded-[30px] border border-[#d9d1c4] bg-white/85 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Bounty brief</p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Maximum bounty</p>
                  <p className="mt-2 text-4xl font-semibold text-[#171717]">{formatUsd(program.maxBountyUsd)}</p>
                </div>

                <div className="space-y-3 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">First response target</span>
                    <span className="text-right text-[#171717]">{program.responseSla}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Payout window</span>
                    <span className="text-right text-[#171717]">{program.payoutWindow}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Your submissions</span>
                    <span className="text-[#171717]">{submissionCount}</span>
                  </div>
                </div>

                <p className="text-sm leading-7 text-[#5f5a51]">{program.duplicatePolicy}</p>

                <div className="grid gap-3">
                  <Button variant={primaryActionTone} size="lg" className="w-full" onClick={handlePrimaryAction}>
                    {primaryActionLabel}
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" onClick={openSubmissionGuide}>
                    Open submission guide
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[#ebe4d8] px-6 py-6 md:px-8 xl:grid-cols-4">
          <MetricCard label="Maximum bounty" value={formatUsd(program.maxBountyUsd)} note={program.payoutCurrency} accent={accentColor} />
          <MetricCard label="Paid out" value={formatUsd(program.paidUsd)} note="Accepted and verified" accent={accentColor} />
          <MetricCard label="Scope assets" value={(program.scopeTargets || []).length} note="Contracts, services, and controls" accent={accentColor} />
          <MetricCard label="Public submissions" value={sortedQueue.length} note="Snapshots shown on this bounty" accent={accentColor} />
        </div>
      </section>

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.94)] p-3 shadow-[0_18px_48px_rgba(30,24,16,0.05)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap gap-2">
            {tabMeta.map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-[22px] px-6 py-2.5 text-center transition ${isActive ? 'bg-[#171717] text-white' : 'text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]'}`}
                >
                  <span className="block text-sm font-semibold uppercase tracking-[0.18em]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden xl:block xl:sticky xl:top-32 xl:self-start">
          <div className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
              {tabMeta.find((tab) => tab.id === activeTab)?.label}
            </p>
            <div className="mt-4 space-y-2">
              {guideSections.map((section, index) => {
                const isActive = activeSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => jumpToSection(section.id)}
                    className={`flex w-full items-start gap-3 rounded-[20px] border px-3 py-3 text-left transition ${isActive ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#ebe4d8] bg-[#fbf8f2] text-[#4b463f] hover:border-[#171717]'}`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/15 text-white' : 'bg-white text-[#171717]'}`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{section.label}</span>
                      <span className={`mt-1 block text-xs ${isActive ? 'text-white/70' : 'text-[#7b7468]'}`}>{section.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <div className="flex gap-2 overflow-x-auto xl:hidden">
            {guideSections.map((section) => (
              <button
                key={section.id}
                onClick={() => jumpToSection(section.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${activeSection === section.id ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#d9d1c4] bg-[#fffdf8] text-[#5f5a51]'}`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <section id="overview-summary" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Overview</p>
                <h2 className="mt-4 font-serif text-4xl text-[#171717] md:text-5xl">A bounty page with the full brief up front.</h2>
                <p className="mt-5 text-base leading-8 text-[#4b463f]">{program.description}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(program.summaryHighlights || []).map((highlight) => (
                    <div key={highlight} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                      <p className="text-sm leading-7 text-[#4b463f]">{highlight}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="overview-task" className="space-y-6">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">The task</p>
                  <h3 className="mt-4 font-serif text-4xl text-[#171717]">What bounty reviewers care about most.</h3>
                  <div className="mt-6 space-y-4">
                    {(focusArea?.items || []).map((item) => (
                      <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                        <p className="text-sm leading-7 text-[#4b463f]">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Submission checklist</p>
                  <div className="mt-6 space-y-4">
                    {(program.submissionChecklist || []).map((item, index) => (
                      <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                        <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section id="overview-tracks" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Tracks</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Surfaces, chains, and environments in play.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">{program.liveMessage}</p>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Categories</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(program.categories || []).map((category) => (
                        <Badge key={category} tone="soft">{formatEnum(category)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Platforms</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(program.platforms || []).map((platform) => (
                        <Badge key={platform} tone="soft">{formatEnum(platform)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Languages</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(program.languages || []).map((language) => (
                        <Badge key={language} tone="soft">{language}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Primary target</p>
                    <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                      {primaryTarget ? getScopeTargetReference(primaryTarget) : 'Targets are listed in the resources tab.'}
                    </p>
                  </div>
                </div>
              </section>

              <section id="overview-evaluation" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Evaluation modes</p>
                <h3 className="mt-4 font-serif text-4xl text-[#171717]">How this bounty evaluates a finding.</h3>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(program.triageStages || []).map((stage, index) => (
                    <div key={stage.title} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Mode {index + 1}</p>
                          <h4 className="mt-2 text-xl font-semibold text-[#171717]">{stage.title}</h4>
                        </div>
                        <Badge tone={stage.automation === 'HUMAN' ? 'soft' : 'accent'}>{formatEnum(stage.automation)}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-[#6f695f]">{stage.owner}</p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{stage.humanGate}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="overview-timeline" className="space-y-6">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How to participate</p>
                      <h3 className="mt-4 font-serif text-4xl text-[#171717]">A clearer path from discovery to response.</h3>
                    </div>
                    <Button variant="outline" size="md" onClick={openSubmissionGuide}>
                      Open submission guide
                    </Button>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {participationSteps.map((step, index) => (
                      <div key={step} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                        <p className="mt-3 text-sm leading-7 text-[#4b463f]">{step}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Timeline</p>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                      <span className="text-[#7b7468]">Bounty opened</span>
                      <span className="text-[#171717]">{formatDate(program.startedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                      <span className="text-[#7b7468]">First response target</span>
                      <span className="text-right text-[#171717]">{program.responseSla}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                      <span className="text-[#7b7468]">Payout window</span>
                      <span className="text-right text-[#171717]">{program.payoutWindow}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#7b7468]">Proof of concept</span>
                      <span className="text-[#171717]">{program.pocRequired ? 'Required' : 'Optional'}</span>
                    </div>
                  </div>
                </article>
              </section>
            </div>
          )}

          {activeTab === 'scope' && (
            <div className="space-y-8">
              <section id="scope-targets" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">In scope</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Targets and environments hunters can test.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
                    Every row includes the exact asset label, location, and severity cap so the bounty brief stays readable.
                  </p>
                </div>
                <ScopeTable targets={program.scopeTargets} />
              </section>

              <section id="scope-notes" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Target notes</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(program.scopeTargets || []).map((target) => (
                    <article key={target.id} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-xl font-semibold text-[#171717]">{target.label}</h4>
                          {target.referenceUrl ? (
                            <a
                              href={target.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-sm text-[#315e50] transition hover:text-[#171717]"
                            >
                              {getScopeTargetReference(target)}
                            </a>
                          ) : (
                            <p className="mt-1 text-sm text-[#6f695f]">{getScopeTargetReference(target)}</p>
                          )}
                        </div>
                        <Badge tone={getSeverityTone(target.severity)}>{formatEnum(target.severity)}</Badge>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[#4b463f]">{target.note}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {getScopeTargetContextChips(target).map((chip) => (
                          <Badge key={`${target.id}-${chip}`} tone="soft">
                            {formatEnum(chip)}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Review status</p>
                        <p className="mt-2 text-sm text-[#171717]">{target.reviewStatus}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section id="scope-evidence" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Evidence bundle</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(program.evidenceFields || []).map((field) => (
                    <div key={field.name} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
                        {field.name.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{field.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="scope-resources" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Resources and references</p>
                <div className="mt-5 space-y-3">
                  {scopeReferences.length > 0 ? (
                    scopeReferences.map((target) => (
                      <a
                        key={target.id}
                        href={target.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm leading-7 text-[#315e50] transition hover:border-[#171717] hover:text-[#171717]"
                      >
                        {target.label}: {target.referenceUrl}
                      </a>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm leading-7 text-[#4b463f]">
                      Public references for this bounty can be attached at the target level as the scope evolves.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'submission' && (
            <div className="space-y-8">
              <section id="submission-readiness" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How to participate</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Agent selection happens before the report form.</h3>
                  </div>
                  <Button variant={primaryActionTone} size="md" onClick={handlePrimaryAction}>
                    {primaryActionLabel}
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {participationSteps.map((step, index) => (
                    <div key={step} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="submission-agents" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Agent selection</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Submission uses your registered hunter agent.</h3>
                  </div>
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-3 text-sm text-[#4b463f]">
                    Campaign-linked agents are shown below for context. The actual report submission uses one of your own created agents.
                  </div>
                </div>

                <div className="mt-6 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                  <ul className="space-y-4 text-sm leading-7 text-[#4b463f]">
                    <li className="flex items-start gap-3 border-b border-[#e6dfd3] pb-4 last:border-b-0 last:pb-0">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d1c4] bg-white text-[10px] font-semibold text-[#171717]">01</span>
                      <span>Open the submission modal and choose one of your registered hunter agents before filling the rest of the report.</span>
                    </li>
                    <li className="flex items-start gap-3 border-b border-[#e6dfd3] pb-4 last:border-b-0 last:pb-0">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d1c4] bg-white text-[10px] font-semibold text-[#171717]">02</span>
                      <span>If you do not have a registered agent yet, create one from the profile menu first. Bounty-linked agents are not the ownership identity used for submission.</span>
                    </li>
                    <li className="flex items-start gap-3 border-b border-[#e6dfd3] pb-4 last:border-b-0 last:pb-0">
                      <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d1c4] bg-white text-[10px] font-semibold text-[#171717]">03</span>
                      <span>The campaign-linked agents below show which agents already participate in this bounty workflow.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Your registered hunter agents</p>
                    {isLoadingOwnedAgents && (
                      <Badge tone="soft">Loading your agents...</Badge>
                    )}
                  </div>
                  {ownedAgents.length > 0 ? (
                    <ul className="mt-4 space-y-4">
                      {ownedAgents.map((agent, index) => (
                        <li key={agent.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6dfd3] pb-4 last:border-b-0 last:pb-0">
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9d1c4] bg-white text-[11px] font-semibold text-[#171717]">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold text-white"
                                  style={{ backgroundColor: accentColorMap[agent.accentTone.toLowerCase()] || '#171717' }}
                                >
                                  {agent.logoMark}
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-[#171717]">{agent.name}</h4>
                                  <p className="text-sm text-[#6f695f]">{agent.headline}</p>
                                </div>
                              </div>
                              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-[#4b463f]">
                                {agent.capabilities.slice(0, 3).map((cap) => (
                                  <li key={cap}>{cap}</li>
                                ))}
                                {agent.recentExecutions?.[0] && (
                                  <li>Latest activity: {formatDateTime(agent.recentExecutions[0].timestamp)}</li>
                                )}
                              </ul>
                            </div>
                          </div>
                          {onOpenAgent && (
                            <Button variant="outline" size="sm" onClick={() => onOpenAgent(agent.id)}>
                              Open agent
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm leading-7 text-[#4b463f]">
                        {user
                          ? 'You do not have any registered agents yet. Create one from the profile menu so you can use it for submisson.'
                          : 'Log in to load your registered hunter agents.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section id="submission-latest" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Latest submissions</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Top 5 latest out of {sortedQueue.length} public submissions.</h3>
                  </div>
                  {latestViewerReport && (
                    <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-3 text-sm text-[#4b463f]">
                      Your latest: <span className="font-semibold text-[#171717]">{formatEnum(latestViewerReport.status)}</span> on {formatDateTime(latestViewerReport.submittedAt)}
                    </div>
                  )}
                </div>
                <div className="mt-6">{renderSubmissionCards(recentPublicSubmissions)}</div>
              </section>

              <section id="submission-payouts" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Past payout history</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Historic payment context for this campaign.</h3>
                  </div>
                  <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-3 text-sm text-[#4b463f]">
                    Total paid so far: <span className="font-semibold text-[#171717]">{formatUsd(program.paidUsd)}</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard label="Paid out" value={formatUsd(program.paidUsd)} note="Accepted and verified" accent={accentColor} />
                  <MetricCard label="Payout window" value={program.payoutWindow} note="After acceptance" accent={accentColor} />
                  <MetricCard label="PoC requirement" value={program.pocRequired ? 'Required' : 'Optional'} note="Submission standard" accent={accentColor} />
                </div>

                <div className="mt-6 space-y-3">
                  {payoutHistory.length > 0 ? (
                    payoutHistory.map((report) => (
                      <article key={report.id} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="soft">{report.humanId}</Badge>
                              <Badge tone={getReportStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                            </div>
                            <h4 className="mt-3 text-lg font-semibold text-[#171717]">{report.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[#4b463f]">{report.note || 'Reward-bearing decision recorded for this public queue snapshot.'}</p>
                          </div>
                          <div className="rounded-[22px] border border-[#e6dfd3] bg-white p-4 text-right">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Estimated payout</p>
                            <p className="mt-2 text-2xl font-semibold text-[#171717]">{formatUsd(report.rewardEstimateUsd || 0)}</p>
                            <p className="mt-3 text-xs text-[#7b7468]">{formatDateTime(report.submittedAt)}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5 text-sm leading-7 text-[#4b463f]">
                      No public payout snapshots are available yet. The bounty still exposes total paid amount, response SLA, and payout window so researchers can gauge campaign maturity.
                    </div>
                  )}
                </div>
              </section>

              <section id="submission-api" className="space-y-8">
                <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Submission format</p>
                  <h3 className="mt-4 font-serif text-4xl text-[#171717]">What this bounty expects in a strong report.</h3>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {submissionFormat.map((section) => (
                      <article key={section.title} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">{section.title}</p>
                        <p className="mt-3 text-sm leading-7 text-[#4b463f]">{section.body}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Hunter submission API</p>
                      <h3 className="mt-4 font-serif text-4xl text-[#171717]">Submit to this bounty programmatically.</h3>
                    </div>
                    <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-3 text-sm text-[#4b463f]">
                      <p><span className="text-[#7b7468]">Generate key:</span> <code>/api/v1/auth/api-key</code></p>
                      <p className="mt-1"><span className="text-[#7b7468]">Submit:</span> <code>/api/v1/reports/submit</code></p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">1. Generate your platform API key</p>
                      <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{apiKeyGenerationCommand}</code></pre>
                      <p className="mt-4 text-sm leading-7 text-[#4b463f]">Generate the key once from the profile panel, then reuse it in the <code>X-API-Key</code> header for automated submissions.</p>
                    </article>

                    <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">2. KG-ready payload</p>
                      <pre className="mt-4 max-h-[360px] overflow-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{submissionPayload}</code></pre>
                    </article>
                  </div>

                  <div className="mt-6 space-y-6">
                    <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">3. cURL example</p>
                      <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{`curl -X POST http://localhost:3001/api/v1/reports/submit \
  -H "X-API-Key: <auditpal_platform_api_key>" \
  -H "Content-Type: application/json" \
  --data @payload.json`}</code></pre>
                    </article>

                    <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">4. After submission</p>
                      <div className="mt-4 grid gap-4">
                        {postSubmissionStates.map((state) => (
                          <div key={state.label} className="rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">{state.label}</p>
                            <p className="mt-2 text-sm leading-7 text-[#4b463f]">{state.body}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                </section>
              </section>
            </div>
          )}

          {activeTab === 'triage' && (
            <div className="space-y-8">
              <section id="triage-flow" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <TriageVisualizer stages={program.triageStages} />
              </section>

              <section id="triage-queue" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                {sortedQueue.length > 0 ? (
                  <QueueSnapshot queue={sortedQueue} />
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Queue snapshot</p>
                    <h3 className="mt-3 font-serif text-4xl text-[#171717]">No public queue items yet.</h3>
                    <p className="mt-4 text-sm leading-7 text-[#4b463f]">As soon as the program exposes public report snapshots, they will appear here with severity, route, and decision-owner context.</p>
                  </div>
                )}
              </section>

              <section id="triage-agents" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Agents in this review flow</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {participantAgents.length > 0 ? (
                    participantAgents.map((participant) => (
                      <article key={participant.id} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-semibold text-[#171717]">{participant.name}</h4>
                            <p className="mt-1 text-sm text-[#6f695f]">{participant.recentTitle || 'Linked to this bounty workflow'}</p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-white text-sm font-semibold text-[#171717]">
                            {participant.logoMark}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#4b463f]">{participant.purpose}</p>
                        <div className="mt-4 rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Trigger</p>
                          <p className="mt-2 text-sm leading-7 text-[#4b463f]">{participant.trigger}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5 text-sm leading-7 text-[#4b463f]">
                      No linked agents are public for this bounty yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-8">
              <section id="policy-rewards" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <RewardMatrix matrix={program.rewardTiers} />
              </section>

              <section id="policy-rules" className="space-y-6">
                {policySections.map((section) => (
                  <article key={section.title} className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">{section.title}</p>
                    <ul className="mt-5 space-y-3 text-sm leading-7 text-[#4b463f]">
                      {section.items.map((item, index) => (
                        <li key={item} className="flex items-start gap-3 border-b border-[#e6dfd3] pb-3 last:border-b-0 last:pb-0">
                          <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#d9d1c4] bg-white text-[10px] font-semibold text-[#171717]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </section>

              <section className="space-y-6">
                <article id="policy-duplicates" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Duplicate policy</p>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[#4b463f]">
                    <li>{program.duplicatePolicy}</li>
                  </ul>
                </article>
                <article id="policy-disclosure" className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Disclosure model</p>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[#4b463f]">
                    <li>{program.disclosureModel}</li>
                  </ul>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-32 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Participants</p>
                <p className="mt-2 text-sm text-[#4b463f]">Agents already attached to this bounty.</p>
              </div>
              <Badge tone="soft">{participantAgents.length}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {participantAgents.length > 0 ? (
                participantAgents.slice(0, 8).map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => onOpenAgent?.(participant.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9d1c4] bg-[#fbf8f2] text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
                    title={participant.name}
                  >
                    {participant.logoMark}
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-3 text-sm text-[#4b463f]">
                  No public participants yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Your status</p>
            {latestViewerReport ? (
              <div className="mt-4 space-y-3 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7b7468]">Researcher</span>
                  <span className="text-right text-[#171717]">{viewerName || latestViewerReport.reporterName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7b7468]">Latest report</span>
                  <span className="text-right text-[#171717]">{latestViewerReport.humanId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7b7468]">Status</span>
                  <Badge tone={getReportStatusTone(latestViewerReport.status)}>{formatEnum(latestViewerReport.status)}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7b7468]">Submitted</span>
                  <span className="text-right text-[#171717]">{formatDateTime(latestViewerReport.submittedAt)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm leading-7 text-[#4b463f]">
                You have not submitted to this bounty yet.
              </div>
            )}
            <Button variant={primaryActionTone} size="md" className="mt-4 w-full" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </Button>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Bounty facts</p>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Bounty code</span>
                <span className="text-[#171717]">{program.code}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Started</span>
                <span className="text-[#171717]">{formatDate(program.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Categories</span>
                <span className="text-right text-[#171717]">{(program.categories || []).map((cat) => formatEnum(cat)).join(', ')}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#7b7468]">Proof of concept</span>
                <span className="text-[#171717]">{program.pocRequired ? 'Required' : 'Optional'}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
