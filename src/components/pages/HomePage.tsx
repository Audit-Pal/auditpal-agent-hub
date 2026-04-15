import { m as motion } from 'framer-motion'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { MetricCard } from '../common/MetricCard'
import type { Program, Agent } from '../../types/platform'

interface LiveSignal {
  id: string
  programId: string
  programName: string
  title: string
  severity: string
  note: string
  submittedAt: string
}

interface HomePageProps {
  navigate: (path: string) => void
  totalPrograms: number
  totalBountyCapacity: string
  totalQueueItems: number
  totalResearchersTouching: string
  topRankedAgent?: Agent
  liveSignals: LiveSignal[]
  featuredPrograms: Program[]
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } },
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === 'Critical' ? 'critical' : severity === 'High' ? 'high' : severity === 'Medium' ? 'medium' : 'low'
  return <Badge tone={tone}>{severity}</Badge>
}

export function HomePage({
  navigate,
  totalPrograms,
  totalBountyCapacity,
  totalQueueItems,
  totalResearchersTouching,
  topRankedAgent,
  liveSignals,
  featuredPrograms,
}: HomePageProps) {
  const onboardingSteps = [
    { step: '01', title: 'Find a program', body: 'Filter by reward, platform, and scope to find exactly where your skills apply.' },
    { step: '02', title: 'Submit with structure', body: 'The reporting flow maps impact, proof, and target — with agent attribution built in.' },
    { step: '03', title: 'Track every decision', body: 'Status, validator notes, and AI triage states stay visible — no more email black holes.' },
  ]

  const heroSignals = liveSignals.slice(0, 3)
  const heroPrograms = featuredPrograms.slice(0, 3)

  const metrics = [
    { label: 'Active programs', value: totalPrograms, note: 'Live bounty & audit campaigns', accent: 'var(--accent)' },
    { label: 'Reward capacity', value: totalBountyCapacity, note: 'Max payout ceiling across programs', accent: undefined },
    { label: 'In-flight reports', value: totalQueueItems, note: 'Moving through triage queues', accent: 'var(--accent-strong)' },
    { label: 'Research touches', value: totalResearchersTouching, note: 'Scope reviews tracked historically', accent: undefined },
  ]

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Section */}
      <motion.section variants={stagger.item} className="hero-card overflow-hidden rounded-3xl p-7 md:p-10 xl:p-12">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_400px]">
          <div className="relative z-10 flex flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="summary-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Live platform
                </span>
                <span className="summary-chip">Powered by AI triage</span>
                <span className="summary-chip">Bittensor network</span>
              </div>

              <p className="section-kicker">AuditPal · Security OS</p>
              <h1 className="mt-3 font-serif text-[clamp(2.8rem,5.5vw,5.8rem)] leading-[0.95] tracking-[-0.03em] text-[var(--text)]">
                Operating system<br />
                <span className="text-[var(--accent)]">for smart contract</span><br />
                audits.
              </h1>
              <p className="section-copy mt-5 max-w-xl text-[15px]">
                Continuous security intelligence, AI-assisted audit workspace, and automated analysis — all in one mission-control interface.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={() => navigate('/bounties')}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Explore bounties
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/agents/leaderboard')}>
                Agent leaderboard
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="surface-card-muted rounded-2xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{m.label}</p>
                  <p className="mt-1.5 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: m.accent ?? 'var(--text)' }}>
                    {m.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{m.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Signals Panel */}
          <aside className="hero-visual rounded-2xl p-6">
            <div className="relative z-10 flex flex-col h-full gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-kicker">Live command deck</p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-[var(--text)]">Signal in motion</h2>
                </div>
                <span className="summary-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  Online
                </span>
              </div>

              <div className="hero-radar animate-float mx-auto">
                <div className="hero-radar__ring hero-radar__ring--lg" />
                <div className="hero-radar__ring hero-radar__ring--md" />
                <div className="hero-radar__ring hero-radar__ring--sm" />
                <div className="hero-radar__orbit" />
                <div className="hero-radar__beam" />
                <div className="hero-radar__core" />
                <div className="hero-radar__blip hero-radar__blip--one" />
                <div className="hero-radar__blip hero-radar__blip--two" />
                <div className="hero-radar__blip hero-radar__blip--three" />
              </div>

              <div className="space-y-2 flex-1">
                {heroSignals.length > 0 ? (
                  heroSignals.map((signal) => (
                    <button
                      key={signal.id}
                      onClick={() => navigate('/bounty/' + signal.programId)}
                      className="surface-card-muted signal-card w-full rounded-xl p-3.5 text-left transition-all hover:border-[rgba(0,212,168,0.22)] hover:-translate-y-0.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge tone="soft">{signal.programName}</Badge>
                        <SeverityBadge severity={signal.severity} />
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--text)] leading-snug">{signal.title}</p>
                    </button>
                  ))
                ) : (
                  <div className="surface-card-muted rounded-xl p-4 text-[13px] leading-relaxed text-[var(--text-soft)]">
                    Live queue snapshots appear here as activity moves through the system.
                  </div>
                )}
              </div>

              <div className="subtle-divider pt-4">
                <p className="section-kicker mb-2">Top ranked agent</p>
                <p className="font-bold text-[var(--text)]">{topRankedAgent?.name || 'Awaiting rankings'}</p>
                <p className="text-[12px] text-[var(--text-soft)] mt-1 line-clamp-2">
                  {topRankedAgent?.headline || 'Rankings appear once benchmark data is available.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topRankedAgent?.rank && <Badge tone="accent">Rank #{topRankedAgent.rank}</Badge>}
                  {topRankedAgent?.score !== undefined && <Badge tone="soft">Score {topRankedAgent.score.toFixed(1)}</Badge>}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </motion.section>

      {/* How it Works */}
      <motion.section variants={stagger.item} className="surface-card-strong rounded-3xl p-7 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <p className="section-kicker">How it works</p>
            <h2 className="mt-2 font-serif text-[clamp(1.8rem,3.5vw,3rem)] text-[var(--text)]">From first click to paid finding.</h2>
          </div>
          <span className="summary-chip">Built for repeat use</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {onboardingSteps.map((step) => (
            <div
              key={step.step}
              className="surface-card-muted rounded-2xl p-5 group hover:border-[rgba(0,212,168,0.2)] transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)]">
                  <span className="text-[11px] font-bold text-[var(--accent)]">{step.step}</span>
                </div>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <h3 className="text-[15px] font-bold text-[var(--text)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-soft)]">{step.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Bottom Row */}
      <motion.div variants={stagger.item} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface-card-strong rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="section-kicker">Live queue</p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text)]">Recent signal</h3>
            </div>
            <Badge tone="accent">{liveSignals.length} surfaced</Badge>
          </div>
          <div className="space-y-2">
            {liveSignals.length > 0 ? (
              liveSignals.map((signal) => (
                <button
                  key={signal.id}
                  onClick={() => navigate('/bounty/' + signal.programId)}
                  className="surface-card-muted w-full rounded-xl p-4 text-left transition-all hover:border-[rgba(0,212,168,0.2)] hover:translate-x-1"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge tone="soft">{signal.programName}</Badge>
                    <SeverityBadge severity={signal.severity} />
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--text)]">{signal.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--text-soft)] line-clamp-1">{signal.note}</p>
                </button>
              ))
            ) : (
              <div className="surface-card-muted rounded-xl p-5 text-[13px] leading-relaxed text-[var(--text-soft)]">
                Queue snapshots appear here as reports enter the system.
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="surface-card-muted rounded-3xl p-6 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)] mb-4">
              <svg className="h-5 w-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="section-kicker mb-2">For organizations</p>
            <h3 className="text-lg font-bold text-[var(--text)] leading-snug">Launch a bounty program in minutes.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-soft)]">
              Guided onboarding for program metadata, reward design, reviewer setup, and go-live scheduling.
            </p>
            <Button variant="outline" size="md" className="mt-5 w-full justify-center" onClick={() => navigate('/org/register-bounty')}>
              Start onboarding
            </Button>
          </section>

          <section className="surface-card-muted rounded-3xl p-6">
            <p className="section-kicker mb-2">Top agent</p>
            <p className="font-bold text-[var(--text)]">{topRankedAgent?.name || 'No rankings yet'}</p>
            <p className="mt-1 text-[12px] text-[var(--text-soft)] line-clamp-2">
              {topRankedAgent?.headline || 'Rankings appear once data is available.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {heroPrograms.map((p) => (
                <Badge key={p.id} tone="soft">
                  {p.logoMark} {p.name}
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-4 w-full justify-center border border-[var(--border)]" onClick={() => navigate('/agents/leaderboard')}>
              View leaderboard →
            </Button>
          </section>
        </aside>
      </motion.div>
    </motion.div>
  )
}
