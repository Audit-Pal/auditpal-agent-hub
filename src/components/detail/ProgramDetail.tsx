import { useState } from 'react'
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

interface ProgramDetailProps {
  program: Program
  submissionCount: number
  onBack: () => void
  onStartSubmission: () => void
}

const accentColorMap = {
  mint: '#3f7d5b',
  violet: '#6f6a93',
  orange: '#9d5a17',
  ink: '#403b35',
  blue: '#3d6b8c',
  rose: '#965c64',
}

const tabMeta: { id: ProgramTab; label: string; hint: string }[] = [
  { id: 'overview', label: 'Overview', hint: 'What the program covers and how it operates' },
  { id: 'scope', label: 'Scope', hint: 'Targets, environments, and evidence fields' },
  { id: 'triage', label: 'Triage', hint: 'How reports move through review' },
  { id: 'policy', label: 'Policy', hint: 'Rewards, exclusions, and disclosure rails' },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function ProgramDetail({
  program,
  submissionCount,
  onBack,
  onStartSubmission,
}: ProgramDetailProps) {
  const [activeTab, setActiveTab] = useState<ProgramTab>('overview')
  const accentColor = accentColorMap[program.accent]
  const focusArea = program.policySections.find((section) => section.title === 'Focus Area')
  const policySections = program.policySections.filter((section) => section.title !== 'Focus Area')

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Programs', onClick: onBack },
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
                <Badge tone="soft">{program.kind}</Badge>
                <Badge tone="accent">{program.triagedLabel}</Badge>
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
                {program.platforms.map((platform) => (
                  <Badge key={platform} tone="soft">
                    {platform}
                  </Badge>
                ))}
                {program.languages.map((language) => (
                  <Badge key={language} tone="soft">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>

            <aside className="rounded-[30px] border border-[#d9d1c4] bg-white/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Researcher brief</p>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Maximum bounty</p>
                  <p className="mt-2 text-4xl font-semibold text-[#171717]">{formatUsd(program.maxBountyUsd)}</p>
                </div>

                <div className="space-y-3 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Response SLA</span>
                    <span className="text-[#171717]">{program.header.responseSla}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Payout window</span>
                    <span className="text-[#171717]">{program.header.payoutWindow}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#7b7468]">Your submissions</span>
                    <span className="text-[#171717]">{submissionCount}</span>
                  </div>
                </div>

                <p className="text-sm leading-7 text-[#5f5a51]">{program.header.duplicatePolicy}</p>

                <div className="grid gap-3">
                  <Button variant="primary" size="lg" className="w-full" onClick={onStartSubmission}>
                    Start report
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => setActiveTab('scope')}
                  >
                    Review scope first
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[#ebe4d8] px-6 py-6 md:px-8 xl:grid-cols-4">
          <MetricCard label="Maximum bounty" value={formatUsd(program.maxBountyUsd)} note={program.header.payoutCurrency} accent={accentColor} />
          <MetricCard label="Paid out" value={formatUsd(program.paidUsd)} note="Accepted and verified" accent={accentColor} />
          <MetricCard label="Scope assets" value={program.scopeTargets.length} note="Contracts, services, and controls" accent={accentColor} />
          <MetricCard label="Scope reviews" value={program.scopeReviews.toLocaleString()} note="Historic program interactions" accent={accentColor} />
        </div>
      </section>

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.92)] p-2 shadow-[0_18px_48px_rgba(30,24,16,0.05)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {tabMeta.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Program summary</p>
                  <h2 className="mt-4 font-serif text-4xl text-[#171717] md:text-5xl">What this program is designed to catch.</h2>
                  <p className="mt-5 text-base leading-8 text-[#4b463f]">{program.description}</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {program.summaryHighlights.map((highlight) => (
                      <div key={highlight} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                        <p className="text-sm leading-7 text-[#4b463f]">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Focus area</p>
                  <h3 className="mt-4 font-serif text-4xl text-[#171717]">What reviewers care about most.</h3>
                  <div className="mt-6 space-y-4">
                    {focusArea?.items.map((item) => (
                      <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                        <p className="text-sm leading-7 text-[#4b463f]">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Linked AI stack</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Automation supports triage, not final authority.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
                    These linked agents explain how the product’s AI layer supports scope checks, provenance, and dispute handling without replacing human review.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {program.linkedAgents.map((link) => (
                    <article key={link.agentId} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <Badge tone="accent">{link.agentId.replace(/-/g, ' ')}</Badge>
                      <h4 className="mt-4 text-xl font-semibold text-[#171717]">{link.purpose}</h4>
                      <p className="mt-3 text-sm leading-7 text-[#4b463f]">{link.trigger}</p>
                      <div className="mt-4 rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                        {link.output}
                      </div>
                    </article>
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
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Targets and environments researchers can test.</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
                    Each asset below includes an exact label, location, and severity cap so the detail page behaves more like a real bounty brief.
                  </p>
                </div>
                <ScopeTable targets={program.scopeTargets} />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Target notes</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {program.scopeTargets.map((target) => (
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
                          <Badge
                            tone={
                              target.severity === 'Critical'
                                ? 'critical'
                                : target.severity === 'High'
                                  ? 'high'
                                  : target.severity === 'Medium'
                                    ? 'medium'
                                    : 'low'
                            }
                          >
                            {target.severity}
                          </Badge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#4b463f]">{target.note}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {getScopeTargetContextChips(target).map((chip) => (
                            <Badge key={`${target.id}-${chip}`} tone="soft">
                              {chip}
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

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Evidence bundle</p>
                  <div className="mt-6 space-y-4">
                    {program.evidenceBundle.map((field) => (
                      <div key={field.name} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
                          {field.name.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[#4b463f]">{field.description}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          )}

          {activeTab === 'triage' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <TriageVisualizer stages={program.triageFlow} />
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {program.triageFlow.map((stage, index) => (
                  <article key={stage.title} className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#171717]">{stage.title}</h3>
                      </div>
                      <Badge tone={stage.automation === 'Human' ? 'soft' : 'accent'}>{stage.automation}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-[#6f695f]">{stage.owner}</p>
                    <p className="mt-4 text-sm leading-7 text-[#4b463f]">{stage.trigger}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {stage.outputs.map((output) => (
                        <Badge key={output} tone="soft">
                          {output}
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
                <RewardMatrix matrix={program.rewardMatrix} />
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

              <section className="grid gap-6 md:grid-cols-2">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Duplicate policy</p>
                  <p className="mt-4 text-sm leading-7 text-[#4b463f]">{program.header.duplicatePolicy}</p>
                </article>
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Disclosure model</p>
                  <p className="mt-4 text-sm leading-7 text-[#4b463f]">{program.header.disclosureModel}</p>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Program facts</p>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Program code</span>
                <span className="text-[#171717]">{program.code}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Started</span>
                <span className="text-[#171717]">{formatDate(program.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ebe4d8] pb-3">
                <span className="text-[#7b7468]">Project types</span>
                <span className="text-right text-[#171717]">{program.projectTypes.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#7b7468]">Proof of concept</span>
                <span className="text-[#171717]">{program.header.pocRequired ? 'Required' : 'Optional'}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Submission checklist</p>
            <div className="mt-4 space-y-3">
              {program.submissionChecklist.map((item, index) => (
                <div key={item} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Research note</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">
              This layout now behaves like a proper bounty detail page: visible reward context, explicit scope, readable policy, and a direct path into a working submission flow.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
