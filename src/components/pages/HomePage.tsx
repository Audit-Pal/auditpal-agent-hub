import { m as motion } from 'framer-motion'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import type { Agent, Program } from '../../types/platform'
import { lazy, Suspense } from 'react'
const ParticleMesh = lazy(() => import('../animations/ParticleMesh').then(m => ({ default: m.ParticleMesh })))
const Globe = lazy(() => import('../animations/Globe').then(m => ({ default: m.Globe })))
const HolographicShield = lazy(() => import('../animations/HolographicShield').then(m => ({ default: m.HolographicShield })))
const HolographicCard = lazy(() => import('../animations/HolographicCard').then(m => ({ default: m.HolographicCard })))

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
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } } },
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
}: HomePageProps) {
  const heroSignals = liveSignals.slice(0, 3)

  const metrics = [
    { label: 'Programs', value: totalPrograms, note: 'Live campaigns', accent: 'var(--accent)' },
    { label: 'Capacity', value: totalBountyCapacity, note: 'Max reward ceiling', accent: undefined },
    { label: 'Reports', value: totalQueueItems, note: 'Active triage', accent: 'var(--accent-strong)' },
    { label: 'Research', value: totalResearchersTouching, note: 'Historical touches', accent: undefined },
  ]

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-6 relative">
      <Suspense fallback={null}><ParticleMesh /></Suspense>
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

              <p className="section-kicker">Security OS</p>
              <h1 className="mt-3 font-serif text-[clamp(2.8rem,5.5vw,5.8rem)] leading-[0.95] tracking-[-0.03em] text-[var(--text)]">
                Security<br />
                <span className="text-[var(--accent)]">Intelligence</span><br />
                Operating System.
              </h1>
              <p className="section-copy mt-5 max-w-xl text-[15px]">
                Continuous intelligence, AI-assisted workspace, and automated analysis for secure protocols.
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
                  <p className="section-kicker">Intelligence deck</p>
                  <h2 className="mt-1 text-lg font-bold tracking-[-0.03em] text-[var(--text)]">Live Signals</h2>
                </div>
                <span className="summary-chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  Online
                </span>
              </div>


              <div className="relative mx-auto w-full aspect-square max-w-[280px] flex items-center justify-center">
                <Suspense fallback={<div className="w-[100px] h-[100px] border border-[var(--accent)]/30 rounded-full animate-pulse" />}>
                   <HolographicShield />
                   <div className="absolute inset-0 z-0 p-8">
                     <Globe />
                   </div>
                </Suspense>
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


              <div className="pt-2">
                <p className="section-kicker mb-3">Top ranked agent</p>
                <Suspense fallback={<div className="h-24 rounded-xl bg-[rgba(255,255,255,0.02)] animate-pulse" />}>
                   <HolographicCard agent={topRankedAgent} />
                </Suspense>
              </div>
            </div>
          </aside>
        </div>
      </motion.section>


      {/* Ecosystem & Messaging Section */}
      <motion.section variants={stagger.item} className="pt-8 pb-16 space-y-24">
        {/* Supported Chains Marquee */}
        <div className="space-y-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--text-muted)] opacity-60">
            Supported Chains & Ecosystem
          </p>
          <div className="relative flex overflow-hidden border-y border-white/[0.04] bg-white/[0.01] py-8">
            <motion.div 
              animate={{ x: [0, -1000] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="flex gap-20 whitespace-nowrap px-10"
            >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-20 items-center">
                  {['ETHEREUM', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'BASE', 'BSC', 'LINEA', 'AVALANCHE'].map((chain) => (
                    <span key={chain} className="text-2xl font-black italic tracking-tighter text-[var(--text)] opacity-20 hover:opacity-100 transition-opacity duration-300">
                      {chain}
                    </span>
                  ))}
                </div>
              ))}
            </motion.div>
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--bg)] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--bg)] to-transparent z-10" />
          </div>
        </div>

        {/* Speed Messaging */}
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="font-serif text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.1] tracking-[-0.03em] mb-8">
            <span className="text-[var(--text)]">BEYOND</span>{" "}
            <span className="text-[var(--text-muted)] opacity-40">HUMAN SPEED</span>
          </h2>
          <p className="text-[clamp(1rem,1.5vw,1.3rem)] leading-relaxed text-[var(--text-soft)] max-w-3xl mx-auto font-medium">
            Traditional audits are point-in-time and take weeks. Our agents perform continuous real-time analysis, 
            attack simulations, and exploit discovery at machine speed to increase efficiency and frees auditors 
            to focus on business logic, protocol design, and critical risk decisions.
          </p>
        </div>
      </motion.section>
    </motion.div>
  )
}
