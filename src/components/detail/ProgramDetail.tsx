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
import { HolographicShield } from '../animations/HolographicShield'
import { motion, AnimatePresence } from 'framer-motion'
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
  onLogin?: () => void
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
  mint: '#1eba98',
  violet: '#7d7bf2',
  orange: '#ff9f43',
  ink: '#84b8ff',
  blue: '#4ea8ff',
  rose: '#ff7f96',
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
  onLogin,
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

  const accentColor = accentColorMap[program.accentTone?.toLowerCase()] || '#1eba98'
  const focusArea = (program.policySections || []).find((section) => section.title === 'Focus Area')
  const policySections = (program.policySections || []).filter((section) => section.title !== 'Focus Area')
  const primaryTarget = (program.scopeTargets || [])[0]
  const scopeReferences = (program.scopeTargets || []).filter((target) => Boolean(target.referenceUrl))
  const sortedQueue = sortReportsDescending(program.reports || [])
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

 
  const isOrganization = user?.role === 'ORGANIZATION' || user?.role === 'ADMIN'
  const primaryActionLabel = isOrganization
    ? 'View applications'
    : hasPendingSubmission
      ? 'Waiting for response'
      : 'Submit report'
  const primaryActionTone = hasPendingSubmission && !isOrganization ? 'secondary' : 'primary'

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
    
    // Smooth scroll to content area with proper offset
    // Offset accounts for: main navbar + tab navigation + secondary nav (Overview, The Task, etc.)
    // Adjusted to 280px to show secondary navigation and content start
    setTimeout(() => {
      window.scrollTo({ 
        top: 280, 
        behavior: 'smooth' 
      })
    }, 50)
    
    // Update URL without page reload - only change the path, don't navigate
    if (detailPath && window.history) {
      const newPath = tab === 'submission' ? `${detailPath}/submission` : detailPath
      window.history.replaceState(null, '', newPath)
    }

  }

  const handlePrimaryAction = () => {
    if ((isOrganization || hasPendingSubmission) && onViewResponses) {
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
        <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center text-[var(--text-muted)]">
          <p className="text-sm font-bold uppercase tracking-widest italic">Signal transmission pending</p>
          <p className="mt-2 text-xs">No public dossier snapshots recorded for this campaign.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="group relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 transition-all hover:bg-[rgba(255,255,255,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black font-mono tracking-wider text-[var(--accent)] opacity-60 group-hover:opacity-100">
                    ID // {report.humanId}
                  </span>
                  <Badge tone={getSeverityTone(report.severity)}>{formatEnum(report.severity)}</Badge>
                  <Badge tone={getReportStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                </div>
                <h4 className="mt-5 font-serif text-2xl text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  {report.title}
                </h4>
                <p className="mt-4 text-sm leading-relaxed text-[var(--text-soft)] max-w-3xl border-l-2 border-[var(--border)] pl-5 italic">
                  {report.note || report.route}
                </p>
              </div>

              <div className="w-full xl:w-[240px] shrink-0 space-y-4">
                <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(3,6,8,0.6)] p-5 backdrop-blur-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Observed</p>
                      <p className="mt-1 text-xs font-mono text-[var(--text)]">{formatDateTime(report.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Attack Route</p>
                      <p className="mt-1 text-xs font-mono text-[var(--text)] truncate">{report.route}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action hint visible on hover */}
            <div className="mt-6 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Access Full Report</span>
              <div className="h-[1px] w-8 bg-[var(--accent)]" />
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

      <section className="overflow-hidden rounded-[42px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-lg)] hero-card">
        <div
          className="relative px-6 py-12 md:px-12 md:py-16"
          style={{
            background: `linear-gradient(135deg, ${accentColor}12, rgba(9,18,27,0.98) 40%, rgba(3,6,8,1) 100%)`,
          }}
        >
          <div className="grid gap-12 xl:grid-cols-[1fr_minmax(0,320px)]">
            <div className="flex flex-col justify-center space-y-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{program.triagedLabel}</Badge>
                <Badge tone="soft">{formatEnum(program.kind)}</Badge>
                <span className="h-1 w-1 rounded-full bg-[var(--text-muted)] opacity-50" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Code {program.code}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="section-kicker !tracking-[0.4em] mb-4">
                    {program.company} // SEC-OPS IDENTITY
                  </p>
                  <h1 className="hero-title">
                    {program.name}
                  </h1>
                </div>
                
                <p className="max-w-2xl text-xl leading-relaxed text-[var(--text-soft)] lg:text-2xl">
                  {program.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-6 pt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Max Bounty</p>
                    <p className="text-3xl font-extrabold text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
                  </div>
                  <div className="h-12 w-[1px] bg-[var(--border)]" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Active Scope</p>
                    <p className="text-3xl font-extrabold text-[var(--text)]">{(program.scopeTargets || []).length}</p>
                  </div>
                  <div className="h-12 w-[1px] bg-[var(--border)]" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">SLA</p>
                    <p className="text-3xl font-extrabold text-[var(--text)]">{program.responseSla}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button variant={primaryActionTone} size="lg" className="min-w-[200px]" onClick={handlePrimaryAction}>
                    {primaryActionLabel}
                  </Button>
                  <Button variant="outline" size="lg" className="min-w-[200px]" onClick={openSubmissionGuide}>
                    Technical Brief
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative hidden xl:block">
              <div className="absolute inset-0 bg-radial-[circle,rgba(0,212,168,0.1)_0%,transparent_70%] opacity-50" />
              <HolographicShield />
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--border)] md:grid-cols-4">
          <div className="bg-[var(--surface-strong)] px-8 py-6">
            <MetricCard label="Accepted Reports" value={sortedQueue.length} note="Public snapshots" accent={accentColor} className="!border-0 !bg-transparent !shadow-none !p-0" />
          </div>
          <div className="bg-[var(--surface-strong)] px-8 py-6">
            <MetricCard label="Total Payouts" value={formatUsd(program.paidUsd)} note="Verified findings" accent={accentColor} className="!border-0 !bg-transparent !shadow-none !p-0" />
          </div>
          <div className="bg-[var(--surface-strong)] px-8 py-6">
            <MetricCard label="Avg Response" value={program.responseSla} note="First triage target" accent={accentColor} className="!border-0 !bg-transparent !shadow-none !p-0" />
          </div>
          <div className="bg-[var(--surface-strong)] px-8 py-6">
            <MetricCard label="Status" value="Verified" note={`Updated ${formatDate(program.updatedAt)}`} accent={accentColor} className="!border-0 !bg-transparent !shadow-none !p-0" />
          </div>
        </div>
      </section>

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[var(--border)] bg-[rgba(7,14,20,0.9)] p-3 shadow-[var(--shadow-md)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap gap-2">
            {tabMeta.map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-[22px] border px-6 py-2.5 text-center transition ${isActive ? 'border-[rgba(56,217,178,0.28)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-[#021614]' : 'border-transparent text-[var(--text-soft)] hover:bg-[rgba(13,26,37,0.94)] hover:text-[var(--text)]'}`}
                >
                  <span className="block text-sm font-semibold uppercase tracking-[0.18em]">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)_300px]"
        >
          <aside className="hidden xl:block xl:sticky xl:top-32 xl:self-start">
            <div className="rounded-[30px] border border-[var(--border)] bg-[rgba(10,20,30,0.4)] p-5 shadow-[var(--shadow-md)] backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)] mb-4">
                Section // {tabMeta.find((tab) => tab.id === activeTab)?.label.toUpperCase()}
              </p>
              <div className="space-y-2">
                {guideSections.map((section, index) => {
                  const isActive = activeSection === section.id

                  return (
                    <button
                      key={section.id}
                      onClick={() => jumpToSection(section.id)}
                      className={`flex w-full items-start gap-4 rounded-[20px] border px-4 py-4 text-left transition-all duration-300 ${isActive ? 'border-[var(--accent)] bg-[rgba(0,212,168,0.06)] text-[var(--text)] shadow-[0_0_20px_rgba(0,212,168,0.05)]' : 'border-transparent bg-transparent text-[var(--text-muted)] hover:text-[var(--text-soft)]'}`}
                    >
                      <span
                        className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[9px] font-black border ${isActive ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-ink)]' : 'bg-transparent border-[var(--text-muted)] text-[var(--text-muted)] opacity-40'}`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold tracking-tight ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-soft)]'}`}>{section.label}</span>
                        <span className={`mt-0.5 block text-[10px] uppercase font-bold tracking-widest ${isActive ? 'text-[var(--accent)] opacity-80' : 'text-[var(--text-muted)]'}`}>{section.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <div className="space-y-12">
            <div className="flex gap-2 overflow-x-auto xl:hidden">
              {guideSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => jumpToSection(section.id)}
                  className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition ${activeSection === section.id ? 'border-[var(--accent)] bg-[rgba(0,212,168,0.1)] text-[var(--text)]' : 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-muted)]'}`}
                >
                  {section.label}
                </button>
              ))}
            </div>

          {activeTab === 'overview' && (
            <div className="space-y-12">
              <section id="overview-summary" className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow-xl)] md:p-12">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <Badge tone="soft">Dossier ID: {program.code}</Badge>
                </div>
                <p className="section-kicker !tracking-[0.5em] mb-6">INTELLIGENCE BRIEF</p>
                <h2 className="hero-title max-w-4xl">Comprehensive technical baseline for the {program.name} campaign.</h2>
                <div className="h-1 w-24 bg-[var(--accent)] my-10 rounded-full" />
                <p className="max-w-4xl text-xl leading-relaxed text-[var(--text-soft)]">{program.description}</p>
                <div className="mt-12 grid gap-6 md:grid-cols-2">
                  {(program.summaryHighlights || []).map((highlight) => (
                    <div key={highlight} className="group relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 transition-all hover:bg-[rgba(255,255,255,0.04)]">
                      <div className="absolute -left-1 top-6 h-12 w-1 bg-[var(--accent)] opacity-20 transition-all group-hover:opacity-100" />
                      <p className="text-lg leading-relaxed text-[var(--text-soft)] group-hover:text-[var(--text)]">{highlight}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="overview-task" className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
                <article className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.8)] p-8 backdrop-blur-md">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-radial-[circle,rgba(0,212,168,0.1)_0%,transparent_70%] pointer-events-none" />
                  <p className="section-kicker !tracking-[0.4em] mb-4">CRITICAL FOCUS</p>
                  <h3 className="hero-title !text-3xl lg:!text-4xl mb-8">Primary objectives for this engagement.</h3>
                  <div className="space-y-4">
                    {(focusArea?.items || []).map((item, idx) => (
                      <div key={item} className="flex gap-4 group">
                        <span className="mt-1 h-5 w-5 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[10px] font-black text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)] transition-all">
                          {idx + 1}
                        </span>
                        <p className="text-lg leading-relaxed text-[var(--text-soft)] group-hover:text-[var(--text)] transition-colors">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-8">
                  <p className="section-kicker !tracking-[0.3em] mb-4">OPERATIONAL FLOW</p>
                  <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--text)] mb-8">Submission protocol</h3>
                  <div className="space-y-6">
                    {(program.submissionChecklist || []).map((item, index) => (
                      <div key={item} className="relative pl-8 border-l border-[var(--border)] group">
                        <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[var(--accent)] group-hover:scale-150 transition-transform" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] opacity-60">Phase {String(index + 1).padStart(2, '0')}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)] group-hover:text-[var(--text)]">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section id="overview-tracks" className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.8)] p-8 backdrop-blur-md">
                <div className="flex flex-wrap items-start justify-between gap-8">
                  <div className="max-w-xl">
                    <p className="section-kicker !tracking-[0.4em] mb-4">SURFACE INTEL</p>
                    <h3 className="hero-title !text-3xl lg:!text-4xl mb-6">Environments and technologies in play.</h3>
                    <p className="text-lg leading-relaxed text-[var(--text-soft)]">{program.liveMessage}</p>
                  </div>
                </div>

                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 group hover:translate-y-[-4px] transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {(program.categories || []).map((category) => (
                        <Badge key={category} tone="soft" className="!lowercase !tracking-normal !px-2">{formatEnum(category)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 group hover:translate-y-[-4px] transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Stacks</p>
                    <div className="flex flex-wrap gap-2">
                      {(program.languages || []).map((language) => (
                        <Badge key={language} tone="soft" className="!lowercase !tracking-normal !px-2">{language}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 group hover:translate-y-[-4px] transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {(program.platforms || []).map((platform) => (
                        <Badge key={platform} tone="soft" className="!lowercase !tracking-normal !px-2">{formatEnum(platform)}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 group hover:translate-y-[-4px] transition-all">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Entry Target</p>
                    <p className="text-sm font-bold text-[var(--text-soft)]">
                      {primaryTarget ? getScopeTargetReference(primaryTarget) : 'N/A'}
                    </p>
                  </div>
                </div>
              </section>

              <section id="overview-evaluation" className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.8)] p-8">
                <p className="section-kicker !tracking-[0.4em] mb-4">TRIAGE PROTOCOL</p>
                <h3 className="hero-title !text-3xl lg:!text-4xl mb-12">How findings are scored and validated.</h3>
                <div className="grid gap-px bg-[var(--border)] rounded-[28px] overflow-hidden">
                  {(program.triageStages || []).map((stage, index) => (
                    <div key={stage.title} className="bg-[rgba(10,20,30,0.4)] p-8 flex flex-wrap items-center justify-between gap-8 group hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <div className="flex gap-6 items-center">
                        <span className="h-10 w-10 shrink-0 border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-sm font-black text-[var(--text-muted)]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h4 className="text-xl font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{stage.title}</h4>
                          <p className="mt-1 text-sm text-[var(--text-muted)] font-bold uppercase tracking-widest">{stage.owner}</p>
                        </div>
                      </div>
                      <div className="flex-1 max-w-xl">
                        <p className="text-base leading-relaxed text-[var(--text-soft)]">{stage.humanGate}</p>
                      </div>
                      <Badge tone={stage.automation === 'HUMAN' ? 'soft' : 'accent'}>{formatEnum(stage.automation)}</Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section id="overview-timeline" className="grid gap-8 lg:grid-cols-2">
                <article className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.8)] p-8">
                  <p className="section-kicker !tracking-[0.4em] mb-4">CAMPAIGN STATS</p>
                  <h3 className="hero-title !text-3xl mb-8">Baseline operational data.</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-[var(--border)] group">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-soft)]">Opened</span>
                      <span className="text-lg font-bold text-[var(--text)]">{formatDate(program.startedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-[var(--border)] group">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-soft)]">Triage Target</span>
                      <span className="text-lg font-bold text-[var(--text)] text-right">{program.responseSla}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-[var(--border)] group">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-soft)]">Payout Target</span>
                      <span className="text-lg font-bold text-[var(--text)] text-right">{program.payoutWindow}</span>
                    </div>
                    <div className="flex items-center justify-between py-4 group">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-soft)]">Exploit Proof</span>
                      <span className="text-lg font-bold text-[var(--text)]">{program.pocRequired ? 'MANDATORY' : 'OPTIONAL'}</span>
                    </div>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(0,212,168,0.03)] p-8">
                  <div className="absolute top-0 right-0 p-8">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  </div>
                  <p className="section-kicker !tracking-[0.4em] mb-4 text-[var(--accent)]">ACTION REQUIRED</p>
                  <h3 className="hero-title !text-3xl mb-8">Ready to join the engagement?</h3>
                  <p className="text-lg leading-relaxed text-[var(--text-soft)] mb-10">Review the technical guide or proceed directly to report submission using the unified interface.</p>
                  <div className="grid gap-4">
                    <Button variant={primaryActionTone} size="lg" className="w-full" onClick={handlePrimaryAction}>
                      {primaryActionLabel}
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" onClick={openSubmissionGuide}>
                      Technical Brief
                    </Button>
                  </div>
                </article>
              </section>
            </div>
          )}

          {activeTab === 'scope' && (
            <div className="space-y-8">
              <section id="scope-targets" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">In scope</p>
                    <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Targets and environments hunters can test.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
                    Every row includes the exact asset label, location, and severity cap so the bounty brief stays readable.
                  </p>
                </div>
                <ScopeTable targets={program.scopeTargets} />
              </section>

              <section id="scope-notes" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Target notes</p>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {(program.scopeTargets || []).map((target) => (
                    <article key={target.id} className="group relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-6 xl:p-8 transition-all hover:bg-[rgba(255,255,255,0.02)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xl font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">{target.label}</h4>
                          {target.referenceUrl ? (
                            <a
                              href={target.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block truncate text-xs font-mono text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity"
                            >
                              {getScopeTargetReference(target)}
                            </a>
                          ) : (
                            <p className="mt-2 block truncate text-xs font-mono text-[var(--text-muted)]">{getScopeTargetReference(target)}</p>
                          )}
                        </div>
                        <Badge tone={getSeverityTone(target.severity)} className="shrink-0">{formatEnum(target.severity)}</Badge>
                      </div>
                      
                      <p className="mt-6 text-sm leading-relaxed text-[var(--text-soft)] italic">{target.note}</p>
                      
                      <div className="mt-6 flex flex-wrap gap-2">
                        {getScopeTargetContextChips(target).map((chip) => (
                          <Badge key={`${target.id}-${chip}`} tone="soft">
                            {formatEnum(chip)}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.03)] bg-[rgba(3,6,8,0.4)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Review status</p>
                        <p className="text-sm font-semibold text-[var(--text-soft)]">{target.reviewStatus}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section id="scope-evidence" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Evidence bundle</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(program.evidenceFields || []).map((field) => (
                    <div key={field.name} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                        {field.name.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{field.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="scope-resources" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Resources and references</p>
                <div className="mt-5 space-y-3">
                  {scopeReferences.length > 0 ? (
                    scopeReferences.map((target) => (
                      <a
                        key={target.id}
                        href={target.referenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--accent-strong)] transition hover:border-[rgba(56,217,178,0.24)] hover:text-[var(--text)]"
                      >
                        {target.label}: {target.referenceUrl}
                      </a>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--text-soft)]">
                      Public references for this bounty can be attached at the target level as the scope evolves.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'submission' && (
            <div className="space-y-8">
              <section id="submission-readiness" className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.8)] p-8">
                <div className="flex flex-wrap items-center justify-between gap-8 mb-12">
                  <div className="max-w-2xl">
                    <p className="section-kicker !tracking-[0.4em] mb-4">SUBMISSION PROTOCOL</p>
                    <h3 className="hero-title !text-3xl lg:!text-4xl">Agent synchronization required for reporting.</h3>
                  </div>
                  <Button variant={primaryActionTone} size="lg" className="min-w-[200px] shadow-[0_0_30px_rgba(0,212,168,0.2)]" onClick={handlePrimaryAction}>
                    {primaryActionLabel}
                  </Button>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {participationSteps.map((step, index) => (
                    <div key={step} className="group relative rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 transition-all hover:bg-[rgba(255,255,255,0.04)]">
                      <span className="text-[10px] font-black font-mono text-[var(--accent)] opacity-40 group-hover:opacity-100">STEP // {String(index + 1).padStart(2, '0')}</span>
                      <p className="mt-4 text-sm leading-relaxed text-[var(--text-soft)] group-hover:text-[var(--text)]">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="submission-agents" className="relative overflow-hidden rounded-[42px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-8">
                <div className="flex flex-wrap items-end justify-between gap-8 mb-10">
                  <div className="max-w-xl">
                    <p className="section-kicker !tracking-[0.4em] mb-4">AGENT SELECTION</p>
                    <h3 className="hero-title !text-3xl">Authorized hunter identity.</h3>
                  </div>
                  <div className="max-w-md rounded-[24px] border border-[var(--border)] bg-[rgba(3,6,8,0.4)] p-5 text-sm leading-relaxed text-[var(--text-muted)] italic">
                    Campaign-linked agents are shown for architectural context. Submissions must originate from your securely registered agent pool.
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[32px] border border-[var(--border)] bg-[rgba(255,255,255,0.01)] p-6">
                    <ul className="grid gap-4 md:grid-cols-3">
                      <li className="flex gap-4 p-4 rounded-[22px] bg-[rgba(3,6,8,0.2)] border border-[var(--border)]">
                        <span className="h-6 w-6 shrink-0 rounded border border-[var(--accent)]/30 bg-[rgba(0,212,168,0.1)] flex items-center justify-center text-[10px] font-black text-[var(--accent)]">01</span>
                        <p className="text-xs leading-relaxed text-[var(--text-soft)]">Initialize submission and select a registered hunter agent.</p>
                      </li>
                      <li className="flex gap-4 p-4 rounded-[22px] bg-[rgba(3,6,8,0.2)] border border-[var(--border)]">
                        <span className="h-6 w-6 shrink-0 rounded border border-[var(--accent)]/30 bg-[rgba(0,212,168,0.1)] flex items-center justify-center text-[10px] font-black text-[var(--accent)]">02</span>
                        <p className="text-xs leading-relaxed text-[var(--text-soft)]">Anonymous or unregistered agents are not permitted for this bounty.</p>
                      </li>
                      <li className="flex gap-4 p-4 rounded-[22px] bg-[rgba(3,6,8,0.2)] border border-[var(--border)]">
                        <span className="h-6 w-6 shrink-0 rounded border border-[var(--accent)]/30 bg-[rgba(0,212,168,0.1)] flex items-center justify-center text-[10px] font-black text-[var(--accent)]">03</span>
                        <p className="text-xs leading-relaxed text-[var(--text-soft)]">Review campaign-linked agents below to understand automated response paths.</p>
                      </li>
                    </ul>
                  </div>

                <div className="mt-6 rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Your registered hunter agents</p>
                    {isLoadingOwnedAgents && (
                      <Badge tone="soft">Loading your agents...</Badge>
                    )}
                  </div>
                  {ownedAgents.length > 0 ? (
                    <ul className="mt-4 space-y-4">
                      {ownedAgents.map((agent, index) => (
                        <li key={agent.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4 last:border-b-0 last:pb-0">
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(9,18,27,0.88)] text-[11px] font-semibold text-[var(--text)]">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold text-white"
                                  style={{ backgroundColor: accentColorMap[agent.accentTone.toLowerCase()] || '#1eba98' }}
                                >
                                  {agent.logoMark}
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-[var(--text)]">{agent.name}</h4>
                                  <p className="text-sm text-[var(--text-soft)]">{agent.headline}</p>
                                </div>
                              </div>
                              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-[var(--text-soft)]">
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
                      <p className="text-sm leading-7 text-[var(--text-soft)]">
                        {user ? (
                          'You do not have any registered agents yet. Create one from the profile menu so you can use it for submisson.'
                        ) : (
                          <>
                            <button
                              onClick={onLogin}
                              className="font-bold text-[var(--accent)] hover:text-[var(--accent-strong)] hover:underline"
                            >
                              Log in
                            </button>{' '}
                            to load your registered hunter agents.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

              <section id="submission-latest" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Latest submissions</p>
                    <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Top 5 latest out of {sortedQueue.length} public submissions.</h3>
                  </div>
                  {latestViewerReport && (
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-soft)]">
                      Your latest: <span className="font-semibold text-[var(--text)]">{formatEnum(latestViewerReport.status)}</span> on {formatDateTime(latestViewerReport.submittedAt)}
                    </div>
                  )}
                </div>
                <div className="mt-6">{renderSubmissionCards(recentPublicSubmissions)}</div>
              </section>

              <section id="submission-payouts" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Past payout history</p>
                    <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Historic payment context for this campaign.</h3>
                  </div>
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-soft)]">
                    Total paid so far: <span className="font-semibold text-[var(--text)]">{formatUsd(program.paidUsd)}</span>
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
                      <article key={report.id} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="soft">{report.humanId}</Badge>
                              <Badge tone={getReportStatusTone(report.status)}>{formatEnum(report.status)}</Badge>
                            </div>
                            <h4 className="mt-3 text-lg font-semibold text-[var(--text)]">{report.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{report.note || 'Reward-bearing decision recorded for this public queue snapshot.'}</p>
                          </div>
                          <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4 text-right">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Estimated payout</p>
                            <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatUsd(report.rewardEstimateUsd || 0)}</p>
                            <p className="mt-3 text-xs text-[var(--text-muted)]">{formatDateTime(report.submittedAt)}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm leading-7 text-[var(--text-soft)]">
                      No public payout snapshots are available yet. The bounty still exposes total paid amount, response SLA, and payout window so researchers can gauge campaign maturity.
                    </div>
                  )}
                </div>
              </section>

              <section id="submission-api" className="space-y-8">
                <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Submission format</p>
                  <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">What this bounty expects in a strong report.</h3>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {submissionFormat.map((section) => (
                      <article key={section.title} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{section.title}</p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{section.body}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Hunter submission API</p>
                      <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Submit to this bounty programmatically.</h3>
                    </div>
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-soft)]">
                      <p><span className="text-[var(--text-muted)]">Generate key:</span> <code>/api/v1/auth/api-key</code></p>
                      <p className="mt-1"><span className="text-[var(--text-muted)]">Submit:</span> <code>/api/v1/reports/submit</code></p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">1. Generate your platform API key</p>
                      <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4 text-sm leading-6 text-[var(--text)]"><code>{apiKeyGenerationCommand}</code></pre>
                      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">Generate the key once from the profile panel, then reuse it in the <code>X-API-Key</code> header for automated submissions.</p>
                    </article>

                    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">2. KG-ready payload</p>
                      <pre className="mt-4 max-h-[360px] overflow-auto rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4 text-sm leading-6 text-[var(--text)]"><code>{submissionPayload}</code></pre>
                    </article>
                  </div>

                  <div className="mt-6 space-y-6">
                    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">3. cURL example</p>
                      <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4 text-sm leading-6 text-[var(--text)]"><code>{`curl -X POST http://localhost:3001/api/v1/reports/submit \
  -H "X-API-Key: <auditpal_platform_api_key>" \
  -H "Content-Type: application/json" \
  --data @payload.json`}</code></pre>
                    </article>

                    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">4. After submission</p>
                      <div className="mt-4 grid gap-4">
                        {postSubmissionStates.map((state) => (
                          <div key={state.label} className="rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{state.label}</p>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{state.body}</p>
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
              <section id="triage-flow" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <TriageVisualizer stages={program.triageStages} />
              </section>

              <section id="triage-queue" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                {sortedQueue.length > 0 ? (
                  <QueueSnapshot queue={sortedQueue} />
                ) : (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Queue snapshot</p>
                    <h3 className="mt-3 font-serif text-4xl text-[var(--text)]">No public queue items yet.</h3>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">As soon as the program exposes public report snapshots, they will appear here with severity, route, and decision-owner context.</p>
                  </div>
                )}
              </section>

              <section id="triage-agents" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Agents in this review flow</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {participantAgents.length > 0 ? (
                    participantAgents.map((participant) => (
                      <article key={participant.id} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-semibold text-[var(--text)]">{participant.name}</h4>
                            <p className="mt-1 text-sm text-[var(--text-soft)]">{participant.recentTitle || 'Linked to this bounty workflow'}</p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(9,18,27,0.88)] text-sm font-semibold text-[var(--text)]">
                            {participant.logoMark}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{participant.purpose}</p>
                        <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Trigger</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{participant.trigger}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm leading-7 text-[var(--text-soft)]">
                      No linked agents are public for this bounty yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-8">
              <section id="policy-rewards" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <RewardMatrix matrix={program.rewardTiers} />
              </section>

              <section id="policy-rules" className="space-y-6">
                {policySections.map((section) => (
                  <article key={section.title} className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">{section.title}</p>
                    <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
                      {section.items.map((item, index) => (
                        <li key={item} className="flex items-start gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
                          <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(9,18,27,0.88)] text-[10px] font-semibold text-[var(--text)]">
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
                <article id="policy-duplicates" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Duplicate policy</p>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--text-soft)]">
                    <li>{program.duplicatePolicy}</li>
                  </ul>
                </article>
                <article id="policy-disclosure" className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Disclosure model</p>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--text-soft)]">
                    <li>{program.disclosureModel}</li>
                  </ul>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-32 xl:self-start">
          <section className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[rgba(10,20,30,0.4)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <div className="h-12 w-12 rounded-full border-2 border-dashed border-[var(--accent)] animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">ACTIVE AGENTS</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Verified participation log.</p>
              </div>
              <Badge tone="soft" className="!bg-[rgba(0,212,168,0.1)] !text-[var(--accent)]">{participantAgents.length}</Badge>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {participantAgents.length > 0 ? (
                participantAgents.slice(0, 8).map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => onOpenAgent?.(participant.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] text-sm font-black text-[var(--text-soft)] transition-all hover:border-[var(--accent)] hover:bg-[rgba(0,212,168,0.1)] hover:text-[var(--accent)] hover:scale-110"
                    title={participant.name}
                  >
                    {participant.logoMark}
                  </button>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)] italic">
                  No registered participants.
                </div>
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-6 shadow-[var(--shadow-lg)]">
            <div className="absolute -right-8 -top-8 h-24 w-24 bg-[var(--accent)] opacity-5 blur-3xl" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">HUNTER PROFILE</p>
            {latestViewerReport ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-[var(--border)] bg-[rgba(3,6,8,0.4)] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Operator</span>
                    <span className="text-sm font-bold text-[var(--text)]">{viewerName || latestViewerReport.reporterName}</span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Last Report</span>
                    <span className="text-sm font-mono text-[var(--accent)]">{latestViewerReport.humanId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Status</span>
                    <Badge tone={getReportStatusTone(latestViewerReport.status)}>{formatEnum(latestViewerReport.status)}</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] p-6 text-center">
                <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">Identity ready for engagement. No active dossiers recorded.</p>
              </div>
            )}
            <Button variant={primaryActionTone} size="lg" className="mt-8 w-full shadow-[0_10px_30px_rgba(0,0,0,0.3)]" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </Button>
          </section>

          <section className="rounded-[30px] border border-[var(--border)] bg-[rgba(10,20,30,0.2)] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">MISSION LOG</p>
            <div className="mt-8 space-y-5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Assigned Code</span>
                <span className="text-sm font-mono text-[var(--text)]">{program.code}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Intelligence Live</span>
                <span className="text-sm font-mono text-[var(--text)]">{formatDate(program.startedAt)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Target Scope</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(program.categories || []).map((cat) => (
                    <span key={cat} className="text-[10px] px-2 py-0.5 rounded-sm bg-[var(--surface-muted)] text-[var(--text-soft)] border border-[var(--border)]">
                      {formatEnum(cat)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </aside>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
