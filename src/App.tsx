import { useEffect, useState } from 'react'
import { platformMock } from './data/platformMock'
import type { ProgramKind, ResearcherReport } from './types/platform'

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
import { Shell } from './components/layout/Shell'
import { TopNav } from './components/layout/TopNav'
import { ReportCenter } from './components/submission/ReportCenter'
import { SubmissionModal } from './components/submission/SubmissionModal'

type View = 'home' | 'programs' | 'reports' | 'agents' | 'agent_leaderboard' | 'program_detail' | 'agent_detail'
type AgentHubHash = 'agents' | 'agents/leaderboard'
type SortBy = 'recent' | 'bounty' | 'reviews' | 'name'

const REPORT_STORAGE_KEY = 'auditpal:researcher-reports'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function getInitialReports() {
  if (typeof window === 'undefined') {
    return [] as ResearcherReport[]
  }

  try {
    const raw = window.localStorage.getItem(REPORT_STORAGE_KEY)

    if (!raw) {
      return [] as ResearcherReport[]
    }

    return JSON.parse(raw) as ResearcherReport[]
  } catch {
    return [] as ResearcherReport[]
  }
}

function createReportId(programCode: string, currentCount: number) {
  return `${programCode}-R${String(currentCount + 1).padStart(3, '0')}`
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [agentBackTarget, setAgentBackTarget] = useState<AgentHubHash>('agents')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKind, setSelectedKind] = useState<string>('All kinds')
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All platforms')
  const [sortBy, setSortBy] = useState<SortBy>('recent')

  const [reports, setReports] = useState<ResearcherReport[]>(getInitialReports)
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)
  const [submissionProgramId, setSubmissionProgramId] = useState<string | null>(null)

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '')

      if (!hash || hash === 'home') {
        setView('home')
        setSelectedId(null)
      } else if (hash === 'programs') {
        setView('programs')
        setSelectedId(null)
      } else if (hash === 'reports') {
        setView('reports')
        setSelectedId(null)
      } else if (hash === 'agents') {
        setView('agents')
        setSelectedId(null)
        setAgentBackTarget('agents')
      } else if (hash === 'agents/leaderboard') {
        setView('agent_leaderboard')
        setSelectedId(null)
        setAgentBackTarget('agents/leaderboard')
      } else if (hash.startsWith('program/')) {
        setView('program_detail')
        setSelectedId(hash.replace('program/', ''))
      } else if (hash.startsWith('agent/')) {
        setView('agent_detail')
        setSelectedId(hash.replace('agent/', ''))
      }
    }

    window.addEventListener('hashchange', handleHash)
    handleHash()

    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports))
  }, [reports])

  const navigate = (to: 'home' | 'programs' | 'reports' | 'agents' | 'agents/leaderboard' | `program/${string}` | `agent/${string}`) => {
    window.location.hash = to
  }

  const openAgent = (id: string, source: AgentHubHash) => {
    setAgentBackTarget(source)
    navigate(`agent/${id}`)
  }

  const openSubmission = (programId?: string | null) => {
    setSubmissionProgramId(programId ?? selectedId ?? platformMock.programs[0]?.id ?? null)
    setIsSubmissionOpen(true)
  }

  const closeSubmission = () => {
    setIsSubmissionOpen(false)
  }

  const handleSubmitReport = (
    submission: Omit<
      ResearcherReport,
      'id' | 'programName' | 'programCode' | 'submittedAt' | 'status' | 'route' | 'responseSla' | 'nextAction'
    >,
  ) => {
    const program = platformMock.programs.find((item) => item.id === submission.programId)

    if (!program) {
      return
    }

    const reportCountForProgram = reports.filter((report) => report.programId === program.id).length
    const route =
      submission.severity === 'Critical' || submission.severity === 'High'
        ? 'Priority triage queue'
        : 'Standard intake queue'

    const nextReport: ResearcherReport = {
      ...submission,
      id: createReportId(program.code, reportCountForProgram),
      programName: program.name,
      programCode: program.code,
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
      route,
      responseSla: program.header.responseSla,
      nextAction: `Expect a first triage touch within ${program.header.responseSla}.`,
    }

    setReports((current) => [nextReport, ...current])
    setIsSubmissionOpen(false)
    navigate('reports')
  }

  const featuredPrograms = platformMock.programs.filter((program) => platformMock.hiddenGemIds.includes(program.id))
  const kindOptions = [...new Set(platformMock.programs.map((program) => program.kind))]
  const categoryOptions = [...new Set(platformMock.programs.flatMap((program) => program.categories))]
  const platformOptions = [...new Set(platformMock.programs.flatMap((program) => program.platforms))]

  const filteredPrograms = platformMock.programs
    .filter((program) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        query.length === 0 ||
        program.name.toLowerCase().includes(query) ||
        program.company.toLowerCase().includes(query) ||
        program.tagline.toLowerCase().includes(query) ||
        program.description.toLowerCase().includes(query) ||
        program.languages.some((language) => language.toLowerCase().includes(query))

      const matchesKind = selectedKind === 'All kinds' || program.kind === selectedKind
      const matchesCategory = selectedCategory === 'All categories' || program.categories.includes(selectedCategory as never)
      const matchesPlatform = selectedPlatform === 'All platforms' || program.platforms.includes(selectedPlatform as never)

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

  const currentProgram = platformMock.programs.find((program) => program.id === selectedId)
  const currentAgent = platformMock.agents.find((agent) => agent.id === selectedId)
  const currentAgentLinks = currentAgent
    ? platformMock.programs.flatMap((program) =>
      program.linkedAgents
        .filter((link) => link.agentId === currentAgent.id)
        .map((link) => ({ program, link })),
    )
    : []

  const totalPrograms = platformMock.programs.length
  const totalBountyCapacity = platformMock.programs.reduce((total, program) => total + program.maxBountyUsd, 0)
  const totalQueueItems = platformMock.programs.reduce((total, program) => total + program.reportQueue.length, 0) + reports.length
  const totalResearchersTouching = platformMock.programs.reduce((total, program) => total + program.scopeReviews, 0)
  const liveSignals = platformMock.programs
    .flatMap((program) =>
      program.reportQueue.slice(0, 1).map((item) => ({
        ...item,
        programName: program.name,
        programId: program.id,
      })),
    )
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 4)

  const sortedReports = [...reports].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const topRankedAgent = [...platformMock.agents].sort((a, b) => (a.rank || 99) - (b.rank || 99))[0]

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedKind('All kinds')
    setSelectedCategory('All categories')
    setSelectedPlatform('All platforms')
    setSortBy('recent')
  }

  function renderHome() {
    return (
      <div className="space-y-10">
        <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">AuditPal platform</p>
              <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-none text-[#171717] md:text-7xl">
                Security programs built for serious researchers and security teams.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4b463f]">
                This front-end now behaves more like a HackenProof-style marketplace: curated programs, readable policies, working submission flow, and a clean text-first UI that keeps the platform credible.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={() => navigate('programs')}>
                  Explore programs
                </Button>
                <Button variant="outline" size="lg" onClick={() => openSubmission()}>
                  Submit a report
                </Button>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-4">
                <MetricCard label="Active programs" value={totalPrograms} note="Across bug bounty, audit, and simulation tracks" />
                <MetricCard label="Bounty capacity" value={formatUsd(totalBountyCapacity)} note="Visible maximum reward capacity" />
                <MetricCard label="Reports in motion" value={totalQueueItems} note="Mock queue plus your local submissions" />
                <MetricCard label="Research touches" value={totalResearchersTouching.toLocaleString()} note="Historic scope reviews across the catalog" />
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fbf8f2] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Why it feels fuller now</p>
                <div className="mt-4 space-y-3">
                  {[
                    'Landing experience designed like a product, not a demo.',
                    'Programs can be filtered, explored, and submitted against immediately.',
                    'Researchers get a working inbox with local persistence.',
                  ].map((item, index) => (
                    <div key={item} className="rounded-[22px] border border-[#e6dfd3] bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Point {index + 1}</p>
                      <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fbf8f2] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">AI triage layer</p>
                <h2 className="mt-3 text-2xl font-semibold text-[#171717]">{topRankedAgent?.name}</h2>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">{topRankedAgent?.headline}</p>
                <Button variant="ghost" size="md" className="mt-5" onClick={() => navigate('agents')}>
                  Review AI ops
                </Button>
              </section>
            </aside>
          </div>
        </section>

        <HiddenGems programs={featuredPrograms} onProgramClick={(id) => navigate(`program/${id}`)} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.06)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How it works</p>
                <h2 className="mt-4 font-serif text-5xl text-[#171717]">A cleaner researcher path.</h2>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Discover',
                  body: 'Browse active programs by chain, surface, and reward size with readable filters and scope summaries.',
                },
                {
                  title: 'Submit',
                  body: 'Use the working submission modal to create structured findings against any program in the directory.',
                },
                {
                  title: 'Track',
                  body: 'See your submitted reports in the report center with program context, status, and expected response time.',
                },
              ].map((step, index) => (
                <article key={step.title} className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#171717]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#4b463f]">{step.body}</p>
                </article>
              ))}
            </div>
          </article>

          <aside className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Live signals</p>
            <div className="mt-6 space-y-4">
              {liveSignals.map((signal) => (
                <button
                  key={signal.id}
                  onClick={() => navigate(`program/${signal.programId}`)}
                  className="w-full rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-left transition hover:border-[#171717]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="soft">{signal.programName}</Badge>
                    <Badge tone={signal.severity === 'Critical' ? 'critical' : signal.severity === 'High' ? 'high' : signal.severity === 'Medium' ? 'medium' : 'low'}>
                      {signal.severity}
                    </Badge>
                  </div>
                  <p className="mt-3 text-base font-medium text-[#171717]">{signal.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">{signal.note}</p>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </div>
    )
  }

  function renderProgramsDirectory() {
    return (
      <div className="space-y-8">
        <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Program directory</p>
              <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
                Find clear scope, fast triage, and serious rewards.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4b463f]">
                The design is intentionally minimal and text-led so programs feel trustworthy first. That lets the information do the work instead of over-styling the marketplace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="md" onClick={clearFilters}>
                Reset filters
              </Button>
              <Button variant="primary" size="md" onClick={() => openSubmission()}>
                Submit a report
              </Button>
            </div>
          </div>
        </section>

        {!searchQuery && selectedKind === 'All kinds' && selectedCategory === 'All categories' && selectedPlatform === 'All platforms' && (
          <HiddenGems programs={featuredPrograms} onProgramClick={(id) => navigate(`program/${id}`)} />
        )}

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          category={selectedCategory}
          kind={selectedKind}
          platform={selectedPlatform}
          sortBy={sortBy}
          categories={categoryOptions}
          kinds={kindOptions as ProgramKind[]}
          platforms={platformOptions}
          onCategoryChange={setSelectedCategory}
          onKindChange={setSelectedKind}
          onPlatformChange={setSelectedPlatform}
          onSortChange={(value) => setSortBy(value as SortBy)}
          onClear={clearFilters}
          resultCount={filteredPrograms.length}
        />

        {filteredPrograms.length === 0 ? (
          <section className="rounded-[34px] border border-[#d9d1c4] bg-[#fffdf8] p-8 text-center shadow-[0_20px_60px_rgba(30,24,16,0.06)]">
            <h2 className="font-serif text-4xl text-[#171717]">No programs match the current filters.</h2>
            <p className="mt-4 text-base leading-8 text-[#4b463f]">
              Try widening the query or clearing the filters to bring the full catalog back.
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {filteredPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => navigate(`program/${program.id}`)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderReports() {
    return (
      <ReportCenter
        reports={sortedReports}
        onBrowsePrograms={() => navigate('programs')}
        onNewSubmission={() => openSubmission()}
        onOpenProgram={(programId) => navigate(`program/${programId}`)}
      />
    )
  }

  function renderAgentDirectory() {
    const sortedAgents = [...platformMock.agents].sort((a, b) => a.name.localeCompare(b.name))

    return (
      <div className="space-y-8">
        <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">AI ops</p>
              <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
                The service layer behind triage and review.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4b463f]">
                These pages now do more than describe the agents. Open any runtime to paste a GitHub link, parse the target, click investigation categories, and prepare an agent-specific analysis brief.
              </p>
            </div>

            <Button variant="outline" size="md" onClick={() => navigate('agents/leaderboard')}>
              Open leaderboard
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {sortedAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={() => openAgent(agent.id, 'agents')} />
          ))}
        </div>
      </div>
    )
  }

  function renderAgentLeaderboardPage() {
    return (
      <div className="space-y-8">
        <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Validator leaderboard</p>
              <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
                Ranked agent performance from validator benchmarks.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4b463f]">
                This keeps the original AI benchmarking idea but presents it inside the same calmer, more product-grade visual system.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Current champion</p>
              <p className="mt-3 text-2xl font-semibold text-[#171717]">{topRankedAgent?.name}</p>
              <p className="mt-2 text-sm text-[#4b463f]">
                {topRankedAgent?.minerName} · score {topRankedAgent?.score?.toFixed(1)}
              </p>
            </div>
          </div>
        </section>

        <AgentLeaderboard agents={[...platformMock.agents]} onAgentClick={(id) => openAgent(id, 'agents/leaderboard')} />
      </div>
    )
  }

  return (
    <Shell
      navigation={
        <TopNav
          view={view}
          reportCount={reports.length}
          onNavigate={navigate}
          onSubmit={() => openSubmission()}
        />
      }
    >
      {view === 'home' && renderHome()}
      {view === 'programs' && renderProgramsDirectory()}
      {view === 'reports' && renderReports()}
      {view === 'agents' && renderAgentDirectory()}
      {view === 'agent_leaderboard' && renderAgentLeaderboardPage()}
      {view === 'program_detail' && currentProgram && (
        <ProgramDetail
          program={currentProgram}
          submissionCount={reports.filter((report) => report.programId === currentProgram.id).length}
          onBack={() => navigate('programs')}
          onStartSubmission={() => openSubmission(currentProgram.id)}
        />
      )}
      {view === 'agent_detail' && currentAgent && (
        <AgentDetail
          agent={currentAgent}
          linkedPrograms={currentAgentLinks}
          onBack={() => navigate(agentBackTarget)}
        />
      )}

      <SubmissionModal
        isOpen={isSubmissionOpen}
        programs={platformMock.programs}
        initialProgramId={submissionProgramId}
        onClose={closeSubmission}
        onSubmit={handleSubmitReport}
      />
    </Shell>
  )
}
