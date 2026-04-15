import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type {
  ProgramKind,
  ResearcherReport,
  Program,
  ProgramTab,
  Agent,
  ReportSubmissionInput,
  ValidationAction,
} from './types/platform'

import { Badge } from './components/common/Badge'
import { Button } from './components/common/Button'
import { MetricCard } from './components/common/MetricCard'
import { AgentDetail } from './components/detail/AgentDetail'
import { ProgramDetail } from './components/detail/ProgramDetail'
import { AgentCard } from './components/directory/AgentCard'
import { AgentLeaderboard } from './components/directory/AgentLeaderboard'
import { FilterBar } from './components/directory/FilterBar'
import { HiddenGems } from './components/directory/HiddenGems'
import { ProgramCard } from './components/directory/ProgramCard'
import { BountyRegistration } from './components/organization/BountyRegistration'
import { OrgDashboard } from './components/organization/OrgDashboard'
import { ReportCenter } from './components/submission/ReportCenter'
import { Shell } from './components/layout/Shell'
import { TopNav } from './components/layout/TopNav'
import { SubmissionModal } from './components/submission/SubmissionModal'
import { GatekeeperDashboard } from './components/submission/GatekeeperDashboard'
import { ValidatorDashboard } from './components/submission/ValidatorDashboard'
import { ApiDocs } from './components/docs/ApiDocs'
import { api } from './lib/api'
import { useAuth } from './contexts/AuthContext'
import { LoginModal } from './components/auth/LoginModal'
import { RoleSelectionModal } from './components/auth/RoleSelectionModal'

type SortBy = 'recent' | 'bounty' | 'reviews' | 'name'

interface LiveSignal {
  id: string
  programId: string
  programName: string
  title: string
  severity: string
  note: string
  submittedAt: string
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

const stagger = {
  container: { 
    hidden: {}, 
    show: { 
      transition: { 
        staggerChildren: 0.06,
        delayChildren: 0.05
      } 
    } 
  },
  item: { 
    hidden: { opacity: 0, y: 20 }, 
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1] as any 
      } 
    } 
  },
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === 'Critical' ? 'critical' : severity === 'High' ? 'high' : severity === 'Medium' ? 'medium' : 'low'
  return <Badge tone={tone}>{severity}</Badge>
}

function Home({
  navigate,
  totalPrograms,
  totalBountyCapacity,
  totalQueueItems,
  totalResearchersTouching,
  topRankedAgent,
  liveSignals,
  featuredPrograms,
}: {
  navigate: (path: string) => void
  totalPrograms: number
  totalBountyCapacity: string
  totalQueueItems: number
  totalResearchersTouching: string
  topRankedAgent?: Agent
  liveSignals: LiveSignal[]
  featuredPrograms: Program[]
}) {
  const onboardingSteps = [
    { step: '01', title: 'Find a program', body: 'Filter by reward, platform, and scope to find exactly where your skills apply.' },
    { step: '02', title: 'Submit with structure', body: 'The reporting flow maps impact, proof, and target — with agent attribution built in.' },
    { step: '03', title: 'Track every decision', body: 'Status, validator notes, and AI triage states stay visible — no more email black holes.' },
  ]

  const heroSignals = liveSignals.slice(0, 3)
  const heroPrograms = featuredPrograms.slice(0, 3)

  const metrics = [
    { label: 'Active programs',      value: totalPrograms,             note: 'Live bounty & audit campaigns',       accent: 'var(--accent)' },
    { label: 'Reward capacity',      value: totalBountyCapacity,       note: 'Max payout ceiling across programs',  accent: undefined },
    { label: 'In-flight reports',    value: totalQueueItems,           note: 'Moving through triage queues',        accent: 'var(--accent-strong)' },
    { label: 'Research touches',     value: totalResearchersTouching,  note: 'Scope reviews tracked historically',  accent: undefined },
  ]

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Hero ── */}
      <motion.section 
        variants={stagger.item} 
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hero-card overflow-hidden rounded-3xl p-7 md:p-10 xl:p-12"
      >
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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="primary" size="lg" onClick={() => navigate('/bounties')}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  Explore bounties
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="lg" onClick={() => navigate('/agents/leaderboard')}>
                  Agent leaderboard
                </Button>
              </motion.div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] as any }}
                  className="surface-card-muted rounded-2xl p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{m.label}</p>
                  <p className="mt-1.5 text-2xl font-extrabold tracking-[-0.04em]" style={{ color: m.accent ?? 'var(--text)' }}>
                    {m.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{m.note}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right panel — radar + signals */}
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
                {heroSignals.length > 0 ? heroSignals.map((signal) => (
                  <motion.button
                    key={signal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => navigate('/bounty/' + signal.programId)}
                    className="surface-card-muted signal-card w-full rounded-xl p-3.5 text-left transition-colors hover:border-[rgba(0,212,168,0.22)]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <Badge tone="soft">{signal.programName}</Badge>
                      <SeverityBadge severity={signal.severity} />
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--text)] leading-snug">{signal.title}</p>
                  </motion.button>
                )) : (
                  <div className="surface-card-muted rounded-xl p-4 text-[13px] leading-relaxed text-[var(--text-soft)]">
                    Live queue snapshots appear here as activity moves through the system.
                  </div>
                )}
              </div>

              <div className="subtle-divider pt-4">
                <p className="section-kicker mb-2">Top ranked agent</p>
                <p className="font-bold text-[var(--text)]">{topRankedAgent?.name || 'Awaiting rankings'}</p>
                <p className="text-[12px] text-[var(--text-soft)] mt-1 line-clamp-2">{topRankedAgent?.headline || 'Rankings appear once benchmark data is available.'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topRankedAgent?.rank && <Badge tone="accent">Rank #{topRankedAgent.rank}</Badge>}
                  {topRankedAgent?.score !== undefined && <Badge tone="soft">Score {topRankedAgent.score.toFixed(1)}</Badge>}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </motion.section>

      {/* ── Featured programs ── */}
      <motion.div variants={stagger.item}>
        <HiddenGems programs={featuredPrograms} onProgramClick={(id: string) => navigate('/bounty/' + id)} />
      </motion.div>

      {/* ── How it works ── */}
      <motion.section 
        variants={stagger.item}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.3 }}
        className="surface-card-strong rounded-3xl p-7 md:p-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <p className="section-kicker">How it works</p>
            <h2 className="mt-2 font-serif text-[clamp(1.8rem,3.5vw,3rem)] text-[var(--text)]">From first click to paid finding.</h2>
          </div>
          <span className="summary-chip">Built for repeat use</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {onboardingSteps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as any }}
              className="surface-card-muted rounded-2xl p-5 group hover:border-[rgba(0,212,168,0.2)] transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)]">
                  <span className="text-[11px] font-bold text-[var(--accent)]">{step.step}</span>
                </div>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <h3 className="text-[15px] font-bold text-[var(--text)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-soft)]">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Bottom row ── */}
      <motion.div variants={stagger.item} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Live signals */}
        <section className="surface-card-strong rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="section-kicker">Live queue</p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[var(--text)]">Recent signal</h3>
            </div>
            <Badge tone="accent">{liveSignals.length} surfaced</Badge>
          </div>
          <div className="space-y-2">
            {liveSignals.length > 0 ? liveSignals.map((signal) => (
              <motion.button
                key={signal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate('/bounty/' + signal.programId)}
                className="surface-card-muted w-full rounded-xl p-4 text-left transition-colors hover:border-[rgba(0,212,168,0.2)]"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge tone="soft">{signal.programName}</Badge>
                  <SeverityBadge severity={signal.severity} />
                </div>
                <p className="text-[13px] font-semibold text-[var(--text)]">{signal.title}</p>
                <p className="mt-1 text-[12px] text-[var(--text-soft)] line-clamp-1">{signal.note}</p>
              </motion.button>
            )) : (
              <div className="surface-card-muted rounded-xl p-5 text-[13px] leading-relaxed text-[var(--text-soft)]">
                Queue snapshots appear here as reports enter the system.
              </div>
            )}
          </div>
        </section>

        {/* Org CTA */}
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
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button variant="outline" size="md" className="mt-5 w-full justify-center" onClick={() => navigate('/org/register-bounty')}>
                Start onboarding
              </Button>
            </motion.div>
          </section>

          <section className="surface-card-muted rounded-3xl p-6">
            <p className="section-kicker mb-2">Top agent</p>
            <p className="font-bold text-[var(--text)]">{topRankedAgent?.name || 'No rankings yet'}</p>
            <p className="mt-1 text-[12px] text-[var(--text-soft)] line-clamp-2">{topRankedAgent?.headline || 'Rankings appear once data is available.'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {heroPrograms.map((p) => <Badge key={p.id} tone="soft">{p.logoMark} {p.name}</Badge>)}
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button variant="ghost" size="sm" className="mt-4 w-full justify-center border border-[var(--border)]" onClick={() => navigate('/agents/leaderboard')}>
                View leaderboard →
              </Button>
            </motion.div>
          </section>
        </aside>
      </motion.div>
    </motion.div>
  )
}

function ProgramsDirectory({
  navigate,
  searchQuery,
  selectedKind,
  selectedCategory,
  selectedPlatform,
  featuredPrograms,
  clearFilters,
  setSearchQuery,
  setSelectedCategory,
  setSelectedKind,
  setSelectedPlatform,
  setSortBy,
  sortBy,
  categories,
  kinds,
  platforms,
  filteredPrograms,
}: {
  navigate: (path: string) => void
  searchQuery: string
  selectedKind: string
  selectedCategory: string
  selectedPlatform: string
  featuredPrograms: Program[]
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (cat: string) => void
  setSelectedKind: (kind: string) => void
  setSelectedPlatform: (p: string) => void
  setSortBy: (s: any) => void
  sortBy: string
  categories: string[]
  kinds: ProgramKind[]
  platforms: string[]
  filteredPrograms: Program[]
}) {
  const totalRewardSurface = formatUsd(filteredPrograms.reduce((total, program) => total + program.maxBountyUsd, 0))
  const isFiltered = searchQuery || selectedKind !== 'All kinds' || selectedCategory !== 'All categories' || selectedPlatform !== 'All platforms'

  return (
    <motion.div 
      variants={stagger.container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      <motion.section 
        variants={stagger.item}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.3 }}
        className="hero-card rounded-3xl p-7 md:p-10"
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_300px]">
          <div>
            <p className="section-kicker">Bounty directory</p>
            <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.8rem)] leading-tight text-[var(--text)]">
              Discover programs with clearer scope and stronger rewards.
            </h1>
            <p className="section-copy mt-4 max-w-2xl">
              Filter by platform, kind, and reward band. Cards surface the right operational details so the next step is always obvious.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="summary-chip">{filteredPrograms.length} programs</span>
              <span className="summary-chip">{totalRewardSurface} ceiling</span>
              <span className="summary-chip">{platforms.length} platforms</span>
            </div>
          </div>
          <aside className="surface-card-muted rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Quick tips</p>
              <ul className="space-y-2 text-[13px] leading-relaxed text-[var(--text-soft)]">
                <li className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">→</span> Search by protocol name or stack</li>
                <li className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">→</span> Reward ceiling visible on every card</li>
                <li className="flex gap-2"><span className="text-[var(--accent)] mt-0.5">→</span> Scope, policy, and triage on detail page</li>
              </ul>
            </div>
            {isFiltered && (
              <Button variant="ghost" size="sm" className="w-full justify-center border border-[var(--border)]" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </aside>
        </div>
      </motion.section>

      {!isFiltered && (
        <motion.div variants={stagger.item}>
          <HiddenGems programs={featuredPrograms} onProgramClick={(id: string) => navigate('/bounty/' + id)} />
        </motion.div>
      )}

      <motion.div variants={stagger.item}>
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          category={selectedCategory}
          kind={selectedKind}
          platform={selectedPlatform}
          sortBy={sortBy}
          categories={categories}
          kinds={kinds}
          platforms={platforms}
          onCategoryChange={setSelectedCategory}
          onKindChange={setSelectedKind}
          onPlatformChange={setSelectedPlatform}
          onSortChange={(value) => setSortBy(value)}
          onClear={clearFilters}
          resultCount={filteredPrograms.length}
        />
      </motion.div>

      {filteredPrograms.length === 0 ? (
        <motion.section variants={stagger.item} className="surface-card-strong rounded-3xl p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)] mx-auto mb-5">
            <svg className="h-7 w-7 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <h2 className="font-serif text-3xl text-[var(--text)]">No programs match.</h2>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[var(--text-soft)]">
            Clear the filter stack and widen your search to find nearby programs, technologies, or reward bands.
          </p>
          <Button variant="outline" size="md" className="mt-6" onClick={clearFilters}>Clear filters</Button>
        </motion.section>
      ) : (
        <motion.div variants={stagger.container} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredPrograms.map((program) => (
            <motion.div
              key={program.id}
              variants={stagger.item}
              whileHover={{ y: -5, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProgramCard program={program} onClick={() => navigate('/bounty/' + program.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

function Reports({
  sortedReports,
  user,
  navigate,
  handleValidateReport,
  handleValidateVulnerability,
  handleEditReport,
}: {
  sortedReports: ResearcherReport[]
  user: any
  navigate: (path: string) => void
  handleValidateReport: (reportId: string, action: ValidationAction, notes?: string) => Promise<boolean>
  handleValidateVulnerability: (vulnId: string, action: ValidationAction, notes?: string, rewardAmount?: number) => Promise<boolean>
  handleEditReport: (report: ResearcherReport) => void
}) {
  const [searchParams] = useSearchParams()
  const filterProgramId = searchParams.get('programId')

  const filteredReports = filterProgramId
    ? sortedReports.filter((report) => report.programId === filterProgramId)
    : sortedReports

  const openCount = filteredReports.filter((report) => !['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'].includes(report.status)).length
  const closedCount = filteredReports.length - openCount

  if (user?.role === 'GATEKEEPER') {
    return (
      <div className="space-y-8 animate-fade-in">
        <section className="hero-card rounded-[36px] p-8 md:p-10">
          <p className="section-kicker">Gatekeeper queue</p>
          <h1 className="mt-4 font-serif text-5xl text-[var(--text)]">Triage signal fast and escalate only what matters.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
            This queue is the first human pass. Keep the noise down, preserve context, and move high-confidence findings onward.
          </p>
        </section>
        <GatekeeperDashboard reports={filteredReports} onEscalate={(v) => handleValidateVulnerability(v.id, 'ESCALATE', '')} onReject={(v) => handleValidateVulnerability(v.id, 'REJECT', '')} />
      </div>
    )
  }

  if (user?.role === 'VALIDATOR') {
    return (
      <div className="space-y-8 animate-fade-in">
        <section className="hero-card rounded-[36px] p-8 md:p-10">
          <p className="section-kicker">Validator queue</p>
          <h1 className="mt-4 font-serif text-5xl text-[var(--text)]">Finalize criticality, pay valid work, and keep decisions legible.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
            This workspace is tuned for decisive follow-through: review escalations, confirm reward amounts, and ship outcomes cleanly.
          </p>
        </section>
        <ValidatorDashboard reports={filteredReports} onValidate={(v, a, n, r) => handleValidateVulnerability(v.id, a, n, r)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="hero-card rounded-[38px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-kicker">Application center</p>
            <h1 className="section-title mt-4 max-w-4xl">Track submissions, decisions, and next actions without losing the thread.</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              Every report now sits inside a more readable workspace with status, notes, finding context, and editability
              where it matters.
            </p>
          </div>

          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Open items" value={openCount} note="Reports still moving through triage or decision stages" />
            <MetricCard label="Closed items" value={closedCount} note="Resolved, rejected, duplicate, or completed reports" />
          </aside>
        </div>
      </section>

      <ReportCenter
        reports={filteredReports}
        viewerRole={user?.role ?? null}
        viewerName={user?.name ?? null}
        viewerId={user?.id ?? null}
        onBrowsePrograms={() => navigate('/bounties')}
        onOpenProgram={(programId) => navigate('/bounty/' + programId)}
        onValidate={handleValidateReport}
        onEditReport={handleEditReport}
      />
    </div>
  )
}

function AgentsDirectory({
  leaderboardAgents,
  openAgent,
  navigate,
}: {
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
  navigate: (path: string) => void
}) {
  const sortedAgents = [...leaderboardAgents].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <div>
            <p className="section-kicker">Agent directory</p>
            <h1 className="section-title mt-4 max-w-4xl">The supporting runtime behind triage, benchmarking, and submission workflows.</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              This view is now easier to scan and compare, so researchers and teams can quickly understand which agents are
              tuned for their specific surfaces.
            </p>
          </div>

          <aside className="surface-card-muted rounded-[30px] p-6">
            <p className="section-kicker">Quick snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricCard label="Indexed agents" value={leaderboardAgents.length} className="!rounded-[22px] !p-4" />
              <MetricCard label="Ranked" value={leaderboardAgents.filter((agent) => Boolean(agent.rank)).length} className="!rounded-[22px] !p-4" />
            </div>
            <Button variant="outline" size="md" className="mt-5 w-full justify-center" onClick={() => navigate('/agents/leaderboard')}>
              Open leaderboard view
            </Button>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sortedAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onClick={() => openAgent(agent.id, '/agents')} />
        ))}
      </div>
    </div>
  )
}

function AgentLeaderboardPage({
  topRankedAgent,
  leaderboardAgents,
  openAgent,
}: {
  topRankedAgent?: Agent
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-kicker">Agent leaderboard</p>
            <h1 className="section-title mt-4 max-w-4xl">Ranked performance with clearer context on who is actually delivering signal.</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              Benchmarking is visible, easier to compare, and closer to how teams actually choose specialist tooling in a live program.
            </p>
          </div>

          <aside className="surface-card-muted rounded-[30px] p-6">
            <p className="section-kicker">Current leader</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{topRankedAgent?.name || 'No rankings yet'}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{topRankedAgent?.headline || 'Top agent details will appear here when ranking data is available.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {topRankedAgent?.rank && <Badge tone="new">Rank #{topRankedAgent.rank}</Badge>}
              {topRankedAgent?.validatorScore !== undefined && <Badge tone="accent">Validator {(topRankedAgent.validatorScore || 0).toFixed(2)}</Badge>}
            </div>
          </aside>
        </div>
      </section>

      <AgentLeaderboard agents={leaderboardAgents} onAgentClick={(id: string) => openAgent(id, '/agents/leaderboard')} />
    </div>
  )
}

function ProgramDetailPage({
  user,
  reports,
  navigate,
  openSubmission,
  openAgent,
  initialTab = 'overview',
}: {
  user: any
  reports: ResearcherReport[]
  navigate: (path: string) => void
  openSubmission: (programId?: string | null) => void
  openAgent: (id: string, source: string) => void
  initialTab?: ProgramTab
}) {
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<Program | null>(null)

  useEffect(() => {
    if (id) {
      api.get<Program>(`/programs/${id}`).then((res) => {
        if (res.success) setProgram(res.data)
      })
    }
  }, [id])

  if (!program) return null

  const programReports = reports.filter((report) => report.programId === program.id)
  const hasPendingSubmission = programReports.some(
    (report) => !['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'].includes(report.status)
  )

  return (
    <ProgramDetail
      program={program}
      submissionCount={programReports.length}
      viewerReports={programReports}
      viewerName={user?.name ?? null}
      hasPendingSubmission={hasPendingSubmission}
      onBack={() => navigate('/bounties')}
      onStartSubmission={() => openSubmission(program.id)}
      onViewResponses={() => navigate('/reports')}
      onOpenAgent={(agentId) => openAgent(agentId, '/agents/leaderboard')}
      initialTab={initialTab}
      detailPath={'/bounty/' + program.id}
    />
  )
}

function AgentDetailPage({
  agentBackTarget,
  navigate,
}: {
  agentBackTarget: string
  navigate: (path: string) => void
}) {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)

  useEffect(() => {
    if (!id) return

    api.get<Agent>(`/agents/${id}`).then((res) => {
      if (res.success) setAgent(res.data)
    })
  }, [id])

  if (!agent) return null

  return <AgentDetail agent={agent} linkedPrograms={agent.linkedPrograms || []} onBack={() => navigate(agentBackTarget)} />
}

export default function App() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [agentBackTarget, setAgentBackTarget] = useState<string>('/agents/leaderboard')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKind, setSelectedKind] = useState<string>('All kinds')
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All platforms')
  const [sortBy, setSortBy] = useState<SortBy>('recent')

  const [programs, setPrograms] = useState<Program[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [reports, setReports] = useState<ResearcherReport[]>([])

  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)
  const [submissionProgramId, setSubmissionProgramId] = useState<string | null>(null)
  const [editingReport, setEditingReport] = useState<ResearcherReport | null>(null)
  const [isRoleSelectionOpen, setIsRoleSelectionOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'agent' | 'organization'>('agent')

  const fetchData = useCallback(async () => {
    try {
      const [programsRes, agentsRes, metricsRes] = await Promise.all([
        api.get<Program[]>('/programs'),
        api.get<Agent[]>('/agents'),
        api.get<any>('/metrics'),
      ])

      if (programsRes.success) setPrograms(programsRes.data)
      if (agentsRes.success) setAgents(agentsRes.data)
      if (metricsRes.success) setMetrics(metricsRes.data)
    } catch (error) {
      console.error('Failed to fetch initial data', error)
    }
  }, [])

  const fetchReports = useCallback(async () => {
    if (!user) return

    try {
      const res = await api.get<ResearcherReport[]>('/reports')
      if (res.success) setReports(res.data)
    } catch (error) {
      console.error('Failed to fetch reports', error)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (user) {
      fetchReports()
    } else {
      setReports([])
    }
  }, [user, fetchReports])

  const openAgent = (id: string, source: string) => {
    setAgentBackTarget(source)
    navigate(`/agent/${id}`)
  }

  const openSubmission = (programId?: string | null) => {
    setSubmissionProgramId(programId ?? programs[0]?.id ?? null)
    setEditingReport(null)
    setIsSubmissionOpen(true)
  }

  const handleEditReport = (report: ResearcherReport) => {
    setEditingReport(report)
    setSubmissionProgramId(report.programId)
    setIsSubmissionOpen(true)
  }

  const closeSubmission = () => {
    setIsSubmissionOpen(false)
    setEditingReport(null)
  }

  const handleSubmitReport = async (submission: ReportSubmissionInput) => {
    if (!user) {
      setIsRoleSelectionOpen(true)
      return
    }

    try {
      if (editingReport) {
        // For editing, we need to update the vulnerability within the report
        const firstVuln = submission.vulnerabilities[0]
        if (firstVuln) {
          const res = await api.patch<ResearcherReport>(`/reports/${editingReport.id}`, {
            title: submission.title,
            vulnerabilities: submission.vulnerabilities,
          })

          if (res.success) {
            setReports((current) => current.map((report) => (report.id === res.data.id ? res.data : report)))
            setIsSubmissionOpen(false)
            setEditingReport(null)
          } else {
            alert(res.error || 'Update failed')
          }
        }
        return
      }

      const res = await api.post<ResearcherReport>('/reports/submit', {
        ...submission,
        reporterName: user.name,
      })

      if (res.success) {
        setReports((current) => [res.data, ...current.filter((report) => report.id !== res.data.id)])
        setIsSubmissionOpen(false)
        navigate('/reports')
      } else {
        alert(res.error || 'Submission failed')
      }
    } catch (error) {
      console.error('Report submission failed', error)
      alert('An unexpected error occurred during submission.')
    }
  }

  const handleValidateReport = async (reportId: string, action: ValidationAction, notes?: string, severity?: string) => {
    if (!user) {
      setIsRoleSelectionOpen(true)
      return false
    }

    try {
      const res = await api.post<ResearcherReport>(`/reports/${reportId}/validate`, {
        action,
        notes,
        severity,
      })

      if (res.success) {
        setReports((current) => current.map((report) => (report.id === reportId ? res.data : report)))
        return true
      }

      alert(res.error || 'Validation failed')
    } catch (error) {
      console.error('Report validation failed', error)
      alert('An unexpected error occurred during validation.')
    }

    return false
  }

  const handleValidateVulnerability = async (vulnId: string, action: ValidationAction, notes?: string, rewardAmount?: number) => {
    if (!user) {
      setIsRoleSelectionOpen(true)
      return false
    }

    try {
      const res = await api.post<ResearcherReport>(`/reports/vulnerabilities/${vulnId}/validate`, {
        action,
        notes,
        rewardAmount,
      })

      if (res.success) {
        setReports((current) => current.map((report) => (report.id === res.data.id ? res.data : report)))
        return true
      }

      alert(res.error || 'Validation failed')
    } catch (error) {
      console.error('Vulnerability validation failed', error)
      alert('An unexpected error occurred during validation.')
    }

    return false
  }

  const featuredPrograms = programs.filter((program) => program.isNew)
  const kindOptions = [...new Set(programs.map((program) => program.kind))]
  const categoryOptions = [...new Set(programs.flatMap((program) => program.categories || []))]
  const platformOptions = [...new Set(programs.flatMap((program) => program.platforms || []))]

  const filteredPrograms = programs
    .filter((program) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        query.length === 0 ||
        program.name.toLowerCase().includes(query) ||
        program.company.toLowerCase().includes(query) ||
        program.tagline.toLowerCase().includes(query) ||
        program.description.toLowerCase().includes(query) ||
        (program.languages || []).some((language) => language.toLowerCase().includes(query))

      const matchesKind = selectedKind === 'All kinds' || program.kind === selectedKind
      const matchesCategory = selectedCategory === 'All categories' || (program.categories || []).includes(selectedCategory as never)
      const matchesPlatform = selectedPlatform === 'All platforms' || (program.platforms || []).includes(selectedPlatform as never)

      return matchesQuery && matchesKind && matchesCategory && matchesPlatform
    })
    .sort((left, right) => {
      if (sortBy === 'bounty') {
        return right.maxBountyUsd - left.maxBountyUsd
      }
      if (sortBy === 'reviews') {
        return right.scopeReviews - left.scopeReviews
      }
      if (sortBy === 'name') {
        return left.name.localeCompare(right.name)
      }
      return right.updatedAt.localeCompare(left.updatedAt)
    })

  const totalPrograms = metrics?.programs?.total ?? 0
  const totalBountyCapacity = formatUsd(metrics?.programs?.totalBountyCapacityUsd ?? 0)
  const totalQueueItems = metrics?.reports?.total ?? 0
  const totalResearchersTouching = programs
    .reduce((total, program) => total + program.scopeReviews, 0)
    .toLocaleString()

  const liveSignals = programs
    .flatMap((program) =>
      (program.reportQueue || []).map((report) => ({
        id: report.id,
        programId: program.id,
        programName: program.name,
        title: report.title,
        severity: report.severity.charAt(0) + report.severity.slice(1).toLowerCase(),
        note: report.note || report.route || 'New queue activity available on the program detail page.',
        submittedAt: report.submittedAt,
      }))
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 4)

  const leaderboardAgents = [...agents].sort((left, right) => {
    const rankDelta = (left.rank ?? 999) - (right.rank ?? 999)
    return rankDelta !== 0 ? rankDelta : left.name.localeCompare(right.name)
  })
  const sortedReports = [...reports].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const topRankedAgent = leaderboardAgents[0]

  const handleRoleSelection = (role: 'agent' | 'organization' | 'guest') => {
    if (role === 'guest') {
      setIsRoleSelectionOpen(false)
      navigate('/')
      return
    }
    setSelectedRole(role)
    setIsRoleSelectionOpen(false)
    setIsLoginOpen(true)
  }

  const handleOpenLogin = () => {
    setIsRoleSelectionOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedKind('All kinds')
    setSelectedCategory('All categories')
    setSelectedPlatform('All platforms')
    setSortBy('recent')
  }

  return (
    <Shell navigation={<TopNav pathname={location.pathname} reportCount={reports.length} onLogin={handleOpenLogin} />}>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              navigate={navigate}
              totalPrograms={totalPrograms}
              totalBountyCapacity={totalBountyCapacity}
              totalQueueItems={totalQueueItems}
              totalResearchersTouching={totalResearchersTouching}
              topRankedAgent={topRankedAgent}
              liveSignals={liveSignals}
              featuredPrograms={featuredPrograms}
            />
          }
        />
        <Route
          path="/bounties"
          element={
            <ProgramsDirectory
              navigate={navigate}
              searchQuery={searchQuery}
              selectedKind={selectedKind}
              selectedCategory={selectedCategory}
              selectedPlatform={selectedPlatform}
              featuredPrograms={featuredPrograms}
              clearFilters={clearFilters}
              setSearchQuery={setSearchQuery}
              setSelectedCategory={setSelectedCategory}
              setSelectedKind={setSelectedKind}
              setSelectedPlatform={setSelectedPlatform}
              setSortBy={setSortBy}
              sortBy={sortBy}
              categories={categoryOptions}
              kinds={kindOptions as ProgramKind[]}
              platforms={platformOptions}
              filteredPrograms={filteredPrograms}
            />
          }
        />
        <Route
          path="/programs"
          element={
            <ProgramsDirectory
              navigate={navigate}
              searchQuery={searchQuery}
              selectedKind={selectedKind}
              selectedCategory={selectedCategory}
              selectedPlatform={selectedPlatform}
              featuredPrograms={featuredPrograms}
              clearFilters={clearFilters}
              setSearchQuery={setSearchQuery}
              setSelectedCategory={setSelectedCategory}
              setSelectedKind={setSelectedKind}
              setSelectedPlatform={setSelectedPlatform}
              setSortBy={setSortBy}
              sortBy={sortBy}
              categories={categoryOptions}
              kinds={kindOptions as ProgramKind[]}
              platforms={platformOptions}
              filteredPrograms={filteredPrograms}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <Reports
              sortedReports={sortedReports}
              user={user}
              navigate={navigate}
              handleValidateReport={handleValidateReport}
              handleValidateVulnerability={handleValidateVulnerability}
              handleEditReport={handleEditReport}
            />
          }
        />
        <Route path="/agents" element={<AgentsDirectory leaderboardAgents={leaderboardAgents} openAgent={openAgent} navigate={navigate} />} />
        <Route
          path="/agents/leaderboard"
          element={<AgentLeaderboardPage topRankedAgent={topRankedAgent} leaderboardAgents={leaderboardAgents} openAgent={openAgent} />}
        />
        <Route
          path="/bounty/:id"
          element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} />}
        />
        <Route
          path="/bounty/:id/submission"
          element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} initialTab="submission" />}
        />
        <Route
          path="/program/:id"
          element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} />}
        />
        <Route
          path="/program/:id/submission"
          element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} initialTab="submission" />}
        />
        <Route path="/agent/:id" element={<AgentDetailPage agentBackTarget={agentBackTarget} navigate={navigate} />} />
        <Route path="/org/dashboard" element={<OrgDashboard />} />
        <Route path="/org/register-bounty" element={<BountyRegistration />} />
        <Route path="/org/edit-bounty/:id" element={<BountyRegistration />} />
        <Route path="/docs" element={<ApiDocs />} />
      </Routes>

      <SubmissionModal
        isOpen={isSubmissionOpen}
        programs={programs}
        initialProgramId={submissionProgramId}
        initialData={editingReport}
        onClose={closeSubmission}
        onSubmit={handleSubmitReport}
      />

      <RoleSelectionModal
        isOpen={isRoleSelectionOpen}
        onSelectRole={handleRoleSelection}
        onClose={() => setIsRoleSelectionOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        initialRole={selectedRole}
      />
    </Shell>
  )
}
