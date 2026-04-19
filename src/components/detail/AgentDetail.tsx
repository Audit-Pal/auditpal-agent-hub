import { useState } from 'react'
import type { Agent, AgentLink, Program } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Breadcrumbs } from '../common/Breadcrumbs'
import { Button } from '../common/Button'
import { MetricCard } from '../common/MetricCard'
import { AgentWorkbench } from './AgentWorkbench'
import { formatEnum } from '../../utils/formatters'

interface LinkedProgramContext {
  program: Program
  link: AgentLink
}

interface AgentDetailProps {
  agent: Agent
  linkedPrograms: readonly LinkedProgramContext[]
  onBack: () => void
}

type AgentTab = 'introduction' | 'workbench'

const tabMeta: { id: AgentTab; label: string }[] = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'workbench', label: 'Workbench' },
]

const accentColorMap: Record<string, string> = {
  mint: '#1eba98',
  violet: '#7d7bf2',
  orange: '#ff9f43',
  ink: '#84b8ff',
  blue: '#4ea8ff',
  rose: '#ff7f96',
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
  children: React.ReactNode
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

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <span className="text-[var(--text-soft)]">{label}</span>
      <span className="text-right font-medium text-[var(--text)]">{value}</span>
    </div>
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

export function AgentDetail({ agent, linkedPrograms, onBack }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('introduction')
  const accentColor = accentColorMap[agent.accentTone?.toLowerCase()] || '#1eba98'
  const validatorScore = agent.validatorScore || 0
  const capabilities = agent.capabilities || []
  const tools = agent.tools || []
  const runtimeFlow = agent.runtimeFlow || []
  const recentExecutions = agent.recentExecutions || []
  const supportedSurfaces = agent.supportedSurfaces || []
  const supportedTechnologies = agent.supportedTechnologies || []
  const metrics = agent.metrics || []

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: 'Agent Leaderboard', onClick: onBack },
          { label: agent.name },
        ]}
      />

      <section className="content-auto contain-paint border-b border-[var(--border)] pb-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex min-w-0 items-start gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border text-xl font-extrabold text-[var(--text)]"
              style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}14` }}
            >
              {agent.logoMark}
            </div>

            <div className="min-w-0">
              <p className="text-sm text-[var(--text-soft)]">{agent.minerName || 'Validator-ranked runtime'}</p>
              <h1 className="mt-2 text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-none tracking-tight text-[var(--text)]">
                {agent.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-soft)] md:text-lg">{agent.headline}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {agent.rank && (
                  <Badge tone="accent" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                    RANK #{agent.rank}
                  </Badge>
                )}
                <Badge tone="success" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                  SCORE {agent.score?.toFixed(1) || '0.0'}
                </Badge>
                <Badge tone="soft" className="!rounded-full !px-3 !py-1 !text-[10px] !tracking-[0.18em]">
                  VALIDATOR {validatorScore.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="content-auto contain-paint border-t border-[var(--border)] pt-4 xl:border-t-0 xl:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Benchmark position</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 xl:justify-end">
                <span className="text-[var(--text-soft)]">Global rank</span>
                <span className="font-medium text-[var(--text)]">#{agent.rank || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-4 xl:justify-end">
                <span className="text-[var(--text-soft)]">Bounty footprint</span>
                <span className="font-medium text-[var(--text)]">{linkedPrograms.length} programs</span>
              </div>
              <div className="flex items-center justify-between gap-4 xl:justify-end">
                <span className="text-[var(--text-soft)]">Trust score</span>
                <span className="font-medium text-[var(--text)]">{Math.round(validatorScore * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="border-b border-[var(--border)]">
        <div className="flex gap-6 overflow-x-auto">
          {tabMeta.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'border-b-2 px-1 pb-3 text-sm font-semibold transition-colors',
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

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {activeTab === 'introduction' ? (
            <>
              <DetailSection title="Operating Thesis" subtitle="The core security logic and reasoning model behind this agent's runtime.">
                <div className="rounded-[30px] border border-[var(--border)] bg-[rgba(9,18,27,0.4)] p-6 md:p-8">
                  <p className="text-xl leading-9 text-[var(--text)]">{agent.summary}</p>
                </div>
              </DetailSection>

              <DetailSection title="Core Capabilities" subtitle="Security surfaces where this agent provides the most reliable coverage.">
                <div className="grid gap-4 md:grid-cols-2">
                  {capabilities.map((capability) => (
                    <div key={capability} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-lg font-semibold text-[var(--text)]">{capability}</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                        Specialized module designed for high-fidelity signal extraction and repeated validation.
                      </p>
                    </div>
                  ))}
                </div>
              </DetailSection>

              {(supportedSurfaces.length > 0 || supportedTechnologies.length > 0) && (
                <DetailSection title="Coverage Map" subtitle="Inferred targets and technology stacks most suitable for this agent.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Surfaces</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {supportedSurfaces.map((surface) => (
                          <Badge key={surface} tone="soft">
                            {formatEnum(surface)}
                          </Badge>
                        ))}
                      </div>
                    </article>
                    <article className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Technologies</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {supportedTechnologies.map((technology) => (
                          <Badge key={technology} tone="accent">
                            {technology}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  </div>
                </DetailSection>
              )}

              <DetailSection title="Execution Modules" subtitle="The deep tooling and internal signals used during the analysis phase.">
                <div className="grid gap-4 md:grid-cols-2">
                  {tools.map((tool) => (
                    <article key={tool.name} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-lg font-semibold text-[var(--text)]">{tool.name}</p>
                      {tool.access && <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{formatEnum(tool.access)}</p>}
                      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{tool.useCase}</p>
                    </article>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title="Runtime Flow" subtitle="Step-by-step progression as the agent moves from intake to finalized report.">
                <div className="grid gap-4">
                  {runtimeFlow.map((stage, index) => (
                    <article key={stage.title} className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Stage {index + 1}</p>
                            <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">{stage.title}</h3>
                          </div>
                        </div>
                        <Badge tone="soft">{stage.outputs.length} signals</Badge>
                      </div>
                      <p className="mt-5 text-sm leading-7 text-[var(--text-soft)]">{stage.description}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {stage.outputs.map((output) => (
                          <Badge key={output} tone="soft">
                            {formatEnum(output)}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </DetailSection>

              <DetailSection title="Recent Activity" subtitle="Benchmark history and latest confirmed signals across the marketplace.">
                <div className="space-y-4">
                  {recentExecutions.map((execution) => (
                    <article key={`${execution.title}-${execution.timestamp}`} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-xl">
                          <h4 className="text-xl font-semibold text-[var(--text)]">{execution.title}</h4>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{execution.summary}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone="accent">{execution.status || 'Success'}</Badge>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{execution.timestamp.toString()}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </DetailSection>
            </>
          ) : (
            <AgentWorkbench agent={agent} linkedPrograms={linkedPrograms} />
          )}
        </div>

        <aside className="space-y-8 xl:sticky xl:top-28 xl:self-start">
          <section className="content-auto contain-paint border-t border-[var(--border)] pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Technical performance</p>
            <div className="mt-6 space-y-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} accent={accentColor} />
              ))}
            </div>

            <div className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <MetricRow label="Ranked position" value={`#${agent.rank || '-'}`} />
              <MetricRow label="Validator confidence" value={`${Math.round(validatorScore * 100)}%`} />
              <MetricRow label="Active connections" value={linkedPrograms.length} />
            </div>

            <div className="mt-8">
              <Button variant="outline" size="lg" className="w-full" onClick={() => setActiveTab('workbench')}>
                Open workbench
              </Button>
            </div>
          </section>

          <section className="content-auto contain-paint border-t border-[var(--border)] pt-8 xl:border-l xl:pl-8 xl:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Operator note</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
              The agent overview consolidates the runtime, benchmarks, and latest signals into a unified documentation view.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
