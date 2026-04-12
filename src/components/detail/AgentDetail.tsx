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
  mint: '#3f7d5b',
  violet: '#6f6a93',
  orange: '#9d5a17',
  ink: '#403b35',
  blue: '#3d6b8c',
  rose: '#965c64',
}

const panelMeta: { id: AgentPanel; label: string; hint: string }[] = [
  { id: 'workbench', label: 'Workbench', hint: 'GitHub intake and repo-focused analysis' },
  { id: 'overview', label: 'Overview', hint: 'Role, linked bounties, and toolchain' },
  { id: 'runtime', label: 'Runtime', hint: 'How this agent moves through each stage' },
  { id: 'activity', label: 'Activity', hint: 'Recent benchmarked work and signals' },
]

export function AgentDetail({ agent, linkedPrograms, onBack }: AgentDetailProps) {
  const [activePanel, setActivePanel] = useState<AgentPanel>('workbench')
  const accentColor = accentColorMap[agent.accentTone?.toLowerCase()] || '#171717'
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

      <section className="overflow-hidden rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] shadow-[0_24px_80px_rgba(30,24,16,0.08)]">
        <div
          className="border-b border-[#ebe4d8] px-6 py-8 md:px-8 md:py-10"
          style={{
            background: `linear-gradient(135deg, ${accentColor}12, rgba(255,253,248,0.96) 48%, rgba(255,253,248,1) 100%)`,
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
                  className="flex h-20 w-20 items-center justify-center rounded-[26px] border text-2xl font-semibold text-[#171717]"
                  style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}14` }}
                >
                  {agent.logoMark}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                    Validator-ranked runtime
                  </p>
                  <h1 className="mt-3 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
                    {agent.name}
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4b463f]">{agent.headline}</p>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#ebe4d8] bg-white/80 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Operating thesis</p>
                <p className="mt-4 text-xl leading-9 text-[#171717]">{agent.summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {capabilities.slice(0, 4).map((capability) => (
                  <Badge key={capability} tone="soft">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            <aside className="rounded-[30px] border border-[#d9d1c4] bg-white/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Benchmark deck</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Rank</p>
                  <p className="mt-2 text-2xl font-semibold text-[#171717]">#{agent.rank || '-'}</p>
                </div>
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Score</p>
                  <p className="mt-2 text-2xl font-semibold text-[#171717]">{agent.score?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Validator</p>
                  <p className="mt-2 text-2xl font-semibold text-[#171717]">{validatorScore.toFixed(2)}</p>
                </div>
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Bounties</p>
                  <p className="mt-2 text-2xl font-semibold text-[#171717]">{linkedPrograms.length}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[#7b7468]">Validator confidence</span>
                  <span className="text-[#171717]">{Math.round(validatorScore * 100)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#e6dfd3]">
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

      <nav className="sticky top-24 z-20 rounded-[28px] border border-[#d9d1c4] bg-[rgba(255,253,248,0.92)] p-2 shadow-[0_18px_48px_rgba(30,24,16,0.05)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {panelMeta.map((panel) => {
            const isActive = activePanel === panel.id

            return (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`rounded-[22px] px-4 py-3 text-left transition ${isActive ? 'bg-[#171717] text-white' : 'text-[#5f5a51] hover:bg-[#f6f2ea] hover:text-[#171717]'}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em]">{panel.label}</span>
                <span className={`mt-1 block text-sm ${isActive ? 'text-white/80' : 'text-[#7b7468]'}`}>{panel.hint}</span>
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
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Core capabilities</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {capabilities.map((capability) => (
                      <div key={capability} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <p className="text-lg font-semibold text-[#171717]">{capability}</p>
                        <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                          Built to support repeatable security work rather than one-off interface automation.
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Linked bounties</p>
                  <div className="mt-6 space-y-4">
                    {linkedPrograms.map(({ program, link }) => (
                      <article key={program.id} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-semibold text-[#171717]">{program.name}</h4>
                            <p className="mt-1 text-sm text-[#6f695f]">
                              {program.company} · {formatEnum(program.kind)}
                            </p>
                          </div>
                          <Badge tone="soft">{formatEnum(program.platforms[0] || 'OFFCHAIN')}</Badge>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#4b463f]">{link.purpose}</p>
                        <div className="mt-4 rounded-[20px] border border-[#e6dfd3] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                          {link.trigger}
                        </div>
                      </article>
                    ))}
                    {linkedPrograms.length === 0 && (
                      <div className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5 text-sm leading-7 text-[#4b463f]">
                        No linked bounties were found for this agent in the database yet.
                      </div>
                    )}
                  </div>
                </article>
              </section>

              {(supportedSurfaces.length > 0 || supportedTechnologies.length > 0) && (
                <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Coverage map</p>
                      <h3 className="mt-4 font-serif text-4xl text-[#171717]">What this agent handles best.</h3>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <article className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Supported surfaces</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {supportedSurfaces.map((surface) => (
                          <Badge key={surface} tone="soft">
                            {formatEnum(surface)}
                          </Badge>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Technologies</p>
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

              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Execution modules</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Tooling behind the runtime.</h3>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => (
                    <article key={tool.name} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <p className="text-lg font-semibold text-[#171717]">{tool.name}</p>
                      {tool.access && <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">{formatEnum(tool.access)}</p>}
                      <p className="mt-4 text-sm leading-7 text-[#4b463f]">{tool.useCase}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activePanel === 'runtime' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Runtime flow</p>
                <div className="mt-6 grid gap-4">
                  {runtimeFlow.map((stage, index) => (
                    <article key={stage.title} className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Stage {index + 1}</p>
                            <h3 className="mt-2 text-2xl font-semibold text-[#171717]">{stage.title}</h3>
                          </div>
                        </div>
                        <Badge tone="soft">{stage.outputs.length} outputs</Badge>
                      </div>
                      <p className="mt-5 text-sm leading-7 text-[#4b463f]">{stage.description}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {stage.outputs.map((output) => (
                          <Badge key={output} tone="soft">
                            {formatEnum(output)}
                          </Badge>
                        ))}
                      </div>
                      {stage.humanGate && (
                        <div className="mt-5 rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Human gate</p>
                          <p className="mt-2 text-sm leading-7 text-[#4b463f]">{stage.humanGate}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Active stages</p>
                  <p className="mt-3 text-4xl font-semibold text-[#171717]">{runtimeFlow.length}</p>
                </div>
                <div className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Output signals</p>
                  <p className="mt-3 text-4xl font-semibold text-[#171717]">
                    {runtimeFlow.reduce((total, stage) => total + stage.outputs.length, 0)}
                  </p>
                </div>
                <div className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Recent runs</p>
                  <p className="mt-3 text-4xl font-semibold text-[#171717]">{recentExecutions.length}</p>
                </div>
              </section>
            </div>
          )}

          {activePanel === 'activity' && (
            <div className="space-y-8">
              <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Execution feed</p>
                    <h3 className="mt-4 font-serif text-4xl text-[#171717]">Recent agent activity.</h3>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {recentExecutions.map((execution) => (
                    <article key={`${execution.title}-${execution.timestamp}`} className="rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                          <h4 className="text-xl font-semibold text-[#171717]">{execution.title}</h4>
                          <p className="mt-3 text-sm leading-7 text-[#4b463f]">{execution.summary}</p>
                        </div>
                        <div className="text-right">
                          <Badge tone="accent">{execution.status || 'Successful run'}</Badge>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">{execution.timestamp.toString()}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Bounty footprint</p>
                  <p className="mt-4 text-4xl font-semibold text-[#171717]">{linkedPrograms.length}</p>
                  <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                    Bounties currently depend on this agent for routing, provenance, or dispute handling.
                  </p>
                </article>
                <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Benchmark position</p>
                  <p className="mt-4 text-4xl font-semibold text-[#171717]">#{agent.rank || '-'}</p>
                  <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                    This rank comes directly from the validator benchmark view.
                  </p>
                </article>
              </section>
            </div>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Performance metrics</p>
            <div className="mt-4 grid gap-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} accent={accentColor} />
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Operator note</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">
              The agent leaderboard stays secondary to the bounty marketplace, but the detail pages still feel intentional and useful.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
