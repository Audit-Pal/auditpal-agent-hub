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

type AgentPanel = 'workbench' | 'overview' | 'runtime' | 'activity'

const accentColorMap: Record<string, string> = {
  mint: '#1eba98',
  violet: '#7d7bf2',
  orange: '#ff9f43',
  ink: '#84b8ff',
  blue: '#4ea8ff',
  rose: '#ff7f96',
}

const panelMeta: { id: AgentPanel; label: string; hint: string }[] = [
  { id: 'workbench', label: 'Workbench', hint: 'GitHub intake and repo-focused analysis' },
  { id: 'overview', label: 'Overview', hint: 'Role, linked bounties, and toolchain' },
  { id: 'runtime', label: 'Runtime', hint: 'How this agent moves through each stage' },
  { id: 'activity', label: 'Activity', hint: 'Recent benchmarked work and signals' },
]

export function AgentDetail({ agent, linkedPrograms, onBack }: AgentDetailProps) {
  const [activePanel, setActivePanel] = useState<AgentPanel>('workbench')
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

      <section className="overflow-hidden rounded-[38px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-lg)]">
        <div
          className="border-b border-[var(--border)] px-6 py-8 md:px-8 md:py-10"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, rgba(9,18,27,0.94) 48%, rgba(5,12,18,0.98) 100%)`,
          }}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_320px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {agent.rank && <Badge tone="accent">Rank #{agent.rank}</Badge>}
                {agent.score && <Badge tone="soft">Score {agent.score.toFixed(1)}</Badge>}
                <Badge tone="soft">Validator {validatorScore.toFixed(2)}</Badge>
                {agent.minerName && <Badge tone="soft">{agent.minerName}</Badge>}
              </div>

              <div className="flex items-start gap-5">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-[26px] border text-2xl font-semibold text-[var(--text)]"
                  style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}14` }}
                >
                  {agent.logoMark}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
                    Validator-ranked runtime
                  </p>
                  <h1 className="mt-3 font-serif text-5xl leading-none text-[var(--text)] md:text-6xl">
                    {agent.name}
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">{agent.headline}</p>
                </div>
              </div>

              <div className="rounded-[30px] border border-[var(--border)] bg-[rgba(9,18,27,0.8)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Operating thesis</p>
                <p className="mt-4 text-xl leading-9 text-[var(--text)]">{agent.summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {capabilities.slice(0, 4).map((capability) => (
                  <Badge key={capability} tone="soft">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            <aside className="rounded-[30px] border border-[var(--border)] bg-[rgba(9,18,27,0.8)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Benchmark deck</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Rank</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">#{agent.rank || '-'}</p>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Score</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{agent.score?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Validator</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{validatorScore.toFixed(2)}</p>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Bounties</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{linkedPrograms.length}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--text-muted)]">Validator confidence</span>
                  <span className="text-[var(--text)]">{Math.round(validatorScore * 100)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[var(--border)]">
                  <div className="h-full rounded-full" style={{ width: `${validatorScore * 100}%`, backgroundColor: accentColor }} />
                </div>
              </div>

              <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => setActivePanel('workbench')}>
                Open workbench
              </Button>
            </aside>
          </div>
        </div>
      </section>

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[var(--border)] bg-[rgba(7,14,20,0.9)] p-2 shadow-[var(--shadow-md)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {panelMeta.map((panel) => {
            const isActive = activePanel === panel.id

            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`rounded-[22px] border px-4 py-3 text-left transition ${isActive ? 'border-[rgba(56,217,178,0.28)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-[#021614]' : 'border-transparent text-[var(--text-soft)] hover:bg-[rgba(13,26,37,0.94)] hover:text-[var(--text)]'}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em]">{panel.label}</span>
                <span className={`mt-1 block text-sm ${isActive ? 'text-[#021614]/70' : 'text-[var(--text-muted)]'}`}>{panel.hint}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {activePanel === 'workbench' && (
            <AgentWorkbench agent={agent} linkedPrograms={linkedPrograms} />
          )}

          {activePanel === 'overview' && (
            <div className="space-y-8">
              <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Core capabilities</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {capabilities.map((capability) => (
                      <div key={capability} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                        <p className="text-lg font-semibold text-[var(--text)]">{capability}</p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                          Built to support repeatable security work rather than one-off interface automation.
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Linked bounties</p>
                  <div className="mt-6 space-y-4">
                    {linkedPrograms.map(({ program, link }) => (
                      <article key={program.id} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-semibold text-[var(--text)]">{program.name}</h4>
                            <p className="mt-1 text-sm text-[var(--text-soft)]">
                              {program.company} · {formatEnum(program.kind)}
                            </p>
                          </div>
                          <Badge tone="soft">{formatEnum(program.platforms[0] || 'OFFCHAIN')}</Badge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{link.purpose}</p>
                        <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4 text-sm leading-7 text-[var(--text-soft)]">
                          {link.trigger}
                        </div>
                      </article>
                    ))}
                    {linkedPrograms.length === 0 && (
                      <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm leading-7 text-[var(--text-soft)]">
                        No linked bounties were found for this agent in the database yet.
                      </div>
                    )}
                  </div>
                </article>
              </section>

              {(supportedSurfaces.length > 0 || supportedTechnologies.length > 0) && (
                <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Coverage map</p>
                      <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">What this agent handles best.</h3>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <article className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Supported surfaces</p>
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
                </section>
              )}

              <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Execution modules</p>
                    <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Tooling behind the runtime.</h3>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => (
                    <article key={tool.name} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <p className="text-lg font-semibold text-[var(--text)]">{tool.name}</p>
                      {tool.access && <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{formatEnum(tool.access)}</p>}
                      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{tool.useCase}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activePanel === 'runtime' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Runtime flow</p>
                <div className="mt-6 grid gap-4">
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
                        <Badge tone="soft">{stage.outputs.length} outputs</Badge>
                      </div>
                      <p className="mt-5 text-sm leading-7 text-[var(--text-soft)]">{stage.description}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {stage.outputs.map((output) => (
                          <Badge key={output} tone="soft">
                            {formatEnum(output)}
                          </Badge>
                        ))}
                      </div>
                      {stage.humanGate && (
                        <div className="mt-5 rounded-[20px] border border-[var(--border)] bg-[rgba(9,18,27,0.88)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Human gate</p>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{stage.humanGate}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-md)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Active stages</p>
                  <p className="mt-3 text-4xl font-semibold text-[var(--text)]">{runtimeFlow.length}</p>
                </div>
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-md)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Output signals</p>
                  <p className="mt-3 text-4xl font-semibold text-[var(--text)]">
                    {runtimeFlow.reduce((total, stage) => total + stage.outputs.length, 0)}
                  </p>
                </div>
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-md)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Recent runs</p>
                  <p className="mt-3 text-4xl font-semibold text-[var(--text)]">{recentExecutions.length}</p>
                </div>
              </section>
            </div>
          )}

          {activePanel === 'activity' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Execution feed</p>
                    <h3 className="mt-4 font-serif text-4xl text-[var(--text)]">Recent agent activity.</h3>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {recentExecutions.map((execution) => (
                    <article key={`${execution.title}-${execution.timestamp}`} className="rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                          <h4 className="text-xl font-semibold text-[var(--text)]">{execution.title}</h4>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{execution.summary}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone="accent">{execution.status || 'Successful run'}</Badge>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">{execution.timestamp.toString()}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Bounty footprint</p>
                  <p className="mt-4 text-4xl font-semibold text-[var(--text)]">{linkedPrograms.length}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    Bounties currently depend on this agent for routing, provenance, or dispute handling.
                  </p>
                </article>
                <article className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)] md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Benchmark position</p>
                  <p className="mt-4 text-4xl font-semibold text-[var(--text)]">#{agent.rank || '-'}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    This rank comes directly from the validator benchmark view.
                  </p>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Performance metrics</p>
            <div className="mt-4 grid gap-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} accent={accentColor} />
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-md)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Operator note</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
              The agent leaderboard stays secondary to the bounty marketplace, but the detail pages still feel intentional and useful.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
