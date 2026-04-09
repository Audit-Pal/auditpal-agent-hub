import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Program, ProgramTab } from '../../types/platform'
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

interface ProgramDetailProps {
  program: Program
  submissionCount: number
  onBack: () => void
  onStartSubmission: () => void
  initialTab?: ProgramTab
  detailPath?: string
}

const accentColorMap: Record<string, string> = {
  mint: '#3f7d5b',
  violet: '#6f6a93',
  orange: '#9d5a17',
  ink: '#403b35',
  blue: '#3d6b8c',
  rose: '#965c64',
}

const tabMeta: { id: ProgramTab; label: string; hint: string }[] = [
  { id: 'overview', label: 'Overview', hint: 'Task, tracks, and evaluator focus' },
  { id: 'scope', label: 'Scope', hint: 'Targets, environments, and evidence assets' },
  { id: 'submission', label: 'Submission', hint: 'How to participate and use the Hunter API' },
  { id: 'triage', label: 'Review Flow', hint: 'AI routing, human validation, and queue state' },
  { id: 'policy', label: 'Rewards', hint: 'Payouts, exclusions, timeline, and disclosure rails' },
]

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

function getSeverityTone(severity: string) {
  if (severity === 'CRITICAL') return 'critical' as const
  if (severity === 'HIGH') return 'high' as const
  if (severity === 'MEDIUM') return 'medium' as const
  return 'low' as const
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
    errorLocation: primaryTarget?.referenceKind === 'SOURCE_FILE' ? primaryTarget.referenceValue || 'contracts/core/PolicyGate.sol:88-120' : 'contracts/core/PolicyGate.sol:88-120',
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

export function ProgramDetail({
  program,
  submissionCount,
  onBack,
  onStartSubmission,
  initialTab = 'overview',
  detailPath,
}: ProgramDetailProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ProgramTab>(initialTab)
  const accentColor = accentColorMap[program.accentTone?.toLowerCase()] || '#171717'
  const focusArea = (program.policySections || []).find((section) => section.title === 'Focus Area')
  const policySections = (program.policySections || []).filter((section) => section.title !== 'Focus Area')
  const primaryTarget = (program.scopeTargets || [])[0]
  const scopeReferences = (program.scopeTargets || []).filter((target) => Boolean(target.referenceUrl))
  const submissionExample = buildSubmissionExample(program)
  const submissionPayload = JSON.stringify(submissionExample, null, 2)
  const apiKeyGenerationCommand = `curl -X POST http://localhost:3001/api/v1/auth/api-key \
  -H "Authorization: Bearer <hunter_access_token>"`
  const guideSections = [
    'Overview',
    'The task',
    'Tracks',
    'Evaluation modes',
    'How to participate',
    'Submission format',
    'Profile API key',
    'Hunter submission API',
    'Scoring and prizes',
    'Timeline and rules',
  ]
  const participationSteps = [
    'Log in as a bounty hunter, open the profile panel, and generate a platform API key for the submission API.',
    'Collect a replayable narrative: summary, impact, proof, code location, graph context, and any references you want persisted.',
    'Submit through the frontend form or call the Hunter Submission API programmatically with your platform API key.',
    'Track the report as it moves through low-effort filtering, AI triage, and the organization validator queue.',
  ]
  const submissionFormat = [
    {
      title: 'Finding narrative',
      body: 'Include title, severity, target, summary, impact, and replay proof. This is the core report that low-effort filtering and AI triage inspect first.',
    },
    {
      title: 'Graph seed context',
      body: 'Provide vulnerability class, affected asset, affected component, attack vector, root cause, prerequisites, and tags so the accepted finding can become knowledge-graph-ready later.',
    },
    {
      title: 'References and identifiers',
      body: 'Attach reference IDs, transaction hashes, contract addresses, repository links, and file paths when available so the report remains queryable and reproducible.',
    },
    {
      title: 'Code context',
      body: 'If you attach a code snippet, include the exact error location too. Both are stored now so accepted findings already preserve the evidence needed for a future knowledge base.',
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
      label: '4. Persistence',
      body: 'Accepted findings stay in the database with narrative, KG seed, code evidence, and validator notes.',
    },
  ]

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, program.id])

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

            <aside className="rounded-[30px] border border-[#d9d1c4] bg-white/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Bounty brief</p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Maximum bounty</p>
                  <p className="mt-2 text-4xl font-semibold text-[#171717]">{formatUsd(program.maxBountyUsd)}</p>
                </div>

                <div className="space-y-3 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">First response target</span>
                    <span className="text-[#171717]">{program.responseSla}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Payout window</span>
                    <span className="text-[#171717]">{program.payoutWindow}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Your submissions</span>
                    <span className="text-[#171717]">{submissionCount}</span>
                  </div>
                </div>

                <p className="text-sm leading-7 text-[#5f5a51]">{program.duplicatePolicy}</p>

                <div className="grid gap-3">
                  <Button variant="primary" size="lg" className="w-full" onClick={onStartSubmission}>
                    Submit to this bounty
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={openSubmissionGuide}
                  >
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
          <MetricCard label="Bounty reviews" value={(program.scopeReviews || 0).toLocaleString()} note="Historic bounty interactions" accent={accentColor} />
        </div>
      </section>

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.92)] p-2 shadow-[0_18px_48px_rgba(30,24,16,0.05)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {tabMeta.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-[22px] px-4 py-3 text-left transition ${isActive ? 'bg-[#171717] text-white' : 'text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]'}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em]">{tab.label}</span>
                <span className={`mt-1 block text-sm ${isActive ? 'text-white/80' : 'text-[#7b7468]'}`}>{tab.hint}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Bounty overview</p>
                  <h2 className="mt-4 font-serif text-4xl text-[#171717] md:text-5xl">What this bounty is designed to catch.</h2>
                  <p className="mt-5 text-base leading-8 text-[#4b463f]">{program.description}</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {(program.summaryHighlights || []).map((highlight) => (
                      <div key={highlight} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                        <p className="text-sm leading-7 text-[#4b463f]">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </article>

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
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Tracks</p>
                  <h3 className="mt-4 font-serif text-4xl text-[#171717]">Surfaces, chains, and environments in play.</h3>
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
                          <Badge key={language} tone="soft">{formatEnum(language)}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Primary target</p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{primaryTarget ? getScopeTargetReference(primaryTarget) : 'Targets are listed in the scope tab.'}</p>
                    </div>
                  </div>
                </article>

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Evaluation modes</p>
                  <h3 className="mt-4 font-serif text-4xl text-[#171717]">How this bounty will judge a finding.</h3>
                  <div className="mt-6 space-y-4">
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
                </article>
              </section>

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How to participate</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">A clean path for hunters and agent builders.</h3>
                  </div>
                  <Button variant="outline" size="md" onClick={openSubmissionGuide}>
                    Open Hunter API guide
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
            </div>
          )}

          {activeTab === 'scope' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">In scope</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Targets and environments hunters can test.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
                    Each bounty asset includes an exact label, location, and severity cap so the detail page behaves more like a real bounty brief.
                  </p>
                </div>
                <ScopeTable targets={program.scopeTargets} />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Track notes</p>
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
                </article>

                <div className="space-y-6">
                  <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Evidence bundle</p>
                    <div className="mt-6 space-y-4">
                      {(program.evidenceFields || []).map((field) => (
                        <div key={field.name} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
                            {field.name.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-[#4b463f]">{field.description}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
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
                  </article>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'submission' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How to participate</p>
                <h3 className="mt-4 font-serif text-4xl text-[#171717]">Frontend flow or fully programmatic Hunter submission.</h3>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {participationSteps.map((step, index) => (
                    <div key={step} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Submission format</p>
                <h3 className="mt-4 font-serif text-4xl text-[#171717]">What a bounty submission needs to include.</h3>
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

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">1. Generate your platform API key</p>
                    <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{apiKeyGenerationCommand}</code></pre>
                    <p className="mt-4 text-sm leading-7 text-[#4b463f]">Generate the key once from the profile panel or this endpoint, then reuse that platform API key in the <code>X-API-Key</code> header for automated submissions.</p>
                  </article>

                  <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">2. KG-ready payload</p>
                    <pre className="mt-4 max-h-[360px] overflow-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{submissionPayload}</code></pre>
                  </article>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">3. cURL example</p>
                    <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{`curl -X POST http://localhost:3001/api/v1/reports/submit \\
  -H "X-API-Key: <auditpal_platform_api_key>" \\
  -H "Content-Type: application/json" \\
  --data @payload.json`}</code></pre>
                  </article>

                  <article className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">4. JavaScript example</p>
                    <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-6 text-[#171717]"><code>{`const res = await fetch('http://localhost:3001/api/v1/reports/submit', {
  method: 'POST',
  headers: {
    'X-API-Key': '<auditpal_platform_api_key>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})

const data = await res.json()`}</code></pre>
                  </article>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">After submission</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {postSubmissionStates.map((state) => (
                    <article key={state.label} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">{state.label}</p>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{state.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'triage' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <TriageVisualizer stages={program.triageStages} />
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {(program.triageStages || []).map((stage, index) => (
                  <article key={stage.title} className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#171717]">{stage.title}</h3>
                      </div>
                      <Badge tone={stage.automation === 'HUMAN' ? 'soft' : 'accent'}>{formatEnum(stage.automation)}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-[#6f695f]">{stage.owner}</p>
                    <p className="mt-4 text-sm leading-7 text-[#4b463f]">{stage.trigger}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(stage.outputs || []).map((output) => (
                        <Badge key={output} tone="soft">
                          {formatEnum(output)}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-5 rounded-[20px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Human gate</p>
                      <p className="mt-2 text-sm leading-7 text-[#4b463f]">{stage.humanGate}</p>
                    </div>
                  </article>
                ))}
              </section>

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <QueueSnapshot queue={program.reportQueue} />
              </section>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <RewardMatrix matrix={program.rewardTiers} />
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                {policySections.map((section) => (
                  <article key={section.title} className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">{section.title}</p>
                    <div className="mt-5 space-y-4">
                      {section.items.map((item) => (
                        <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                          <p className="text-sm leading-7 text-[#4b463f]">{item}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </section>

              <section className="grid gap-6 md:grid-cols-3">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Timeline</p>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                      <span className="text-[#7b7468]">Bounty opened</span>
                      <span className="text-[#171717]">{formatDate(program.startedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                      <span className="text-[#7b7468]">Target first touch</span>
                      <span className="text-[#171717]">{program.responseSla}</span>
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
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Duplicate policy</p>
                  <p className="mt-4 text-sm leading-7 text-[#4b463f]">{program.duplicatePolicy}</p>
                </article>
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Disclosure model</p>
                  <p className="mt-4 text-sm leading-7 text-[#4b463f]">{program.disclosureModel}</p>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Bounty guide</p>
            <div className="mt-4 space-y-3">
              {guideSections.map((section, index) => (
                <div key={section} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Section {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">{section}</p>
                </div>
              ))}
            </div>
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

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Submission checklist</p>
            <div className="mt-4 space-y-3">
              {(program.submissionChecklist || []).map((item, index) => (
                <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Hunter API quick note</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">
              Hunters can generate a platform API key from the profile panel, then submit KG-ready reports to <code>/api/v1/reports/submit</code> with the <code>X-API-Key</code> header without touching the UI.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
