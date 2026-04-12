import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
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
import { Shell } from './components/layout/Shell'
import { TopNav } from './components/layout/TopNav'
import { ReportCenter } from './components/submission/ReportCenter'
import { SubmissionModal } from './components/submission/SubmissionModal'
import { api } from './lib/api'
import { useAuth } from './contexts/AuthContext'
import { LoginModal } from './components/auth/LoginModal'

type SortBy = 'recent' | 'bounty' | 'reviews' | 'name'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
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
  topRankedAgent: any
  liveSignals: any[]
  featuredPrograms: Program[]
}) {
  return (
    <div className="space-y-10">
      <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">AuditPal platform</p>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-none text-[#171717] md:text-7xl">
              Security bounties built for serious researchers and security teams.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4b463f]">
              This front-end now behaves more like a HackenProof-style marketplace: curated bounties, readable policies,
              working submission flow, and a clean text-first UI.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={() => navigate('/bounties')}>
                Explore bounties
              </Button>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              <MetricCard label="Active bounties" value={totalPrograms} note="Across bug bounty, audit, and simulation tracks" />
              <MetricCard label="Bounty capacity" value={totalBountyCapacity} note="Visible maximum reward capacity" />
              <MetricCard label="Reports in motion" value={totalQueueItems} note="Platform submissions currently in queue" />
              <MetricCard label="Research touches" value={totalResearchersTouching} note="Historic scope reviews across the catalog" />
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fbf8f2] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Platform focus</p>
              <div className="mt-4 space-y-3">
                {[
                  'Design prioritized for credibility and precision.',
                  'Direct researcher-to-bounty submission flow.',
                  'Unified workspace for AI-assisted triage results.',
                ].map((item, index) => (
                  <div key={item} className="rounded-[22px] border border-[#e6dfd3] bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Point {index + 1}</p>
                    <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fbf8f2] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Agent leaderboard</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#171717]">{topRankedAgent?.name}</h2>
              <p className="mt-3 text-sm leading-7 text-[#4b463f]">{topRankedAgent?.headline}</p>
              <Button variant="ghost" size="md" className="mt-5" onClick={() => navigate('/agents/leaderboard')}>
                Open leaderboard
              </Button>
            </section>
          </aside>
        </div>
      </section>

      <HiddenGems programs={featuredPrograms} onProgramClick={(id: string) => navigate('/bounty/' + id)} />

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
              { title: 'Discover', body: 'Browse active bounties by chain, surface, and reward size.' },
              { title: 'Submit', body: 'Use the working submission modal to create structured findings.' },
              { title: 'Track', body: 'See your submitted reports in the report center.' },
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
                onClick={() => navigate('/bounty/' + signal.programId)}
                className="w-full rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-left transition hover:border-[#171717]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="soft">{signal.programName}</Badge>
                  <Badge
                    tone={
                      signal.severity === 'Critical'
                        ? 'critical'
                        : signal.severity === 'High'
                          ? 'high'
                          : signal.severity === 'Medium'
                            ? 'medium'
                            : 'low'
                    }
                  >
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
  return (
    <div className="space-y-8">
      <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Bounty directory</p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
              Find clear scope, fast triage, and serious rewards.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4b463f]">
              Curated bounties and readable policies let the information do the work.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="md" onClick={clearFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      </section>

      {!searchQuery && selectedKind === 'All kinds' && selectedCategory === 'All categories' && selectedPlatform === 'All platforms' && (
        <HiddenGems programs={featuredPrograms} onProgramClick={(id: string) => navigate('/bounty/' + id)} />
      )}

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

      {filteredPrograms.length === 0 ? (
        <section className="rounded-[34px] border border-[#d9d1c4] bg-[#fffdf8] p-8 text-center shadow-[0_20px_60px_rgba(30,24,16,0.06)]">
          <h2 className="font-serif text-4xl text-[#171717]">No bounties match the current filters.</h2>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} onClick={() => navigate('/bounty/' + program.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function Reports({
  sortedReports,
  user,
  navigate,
  handleValidateReport,
  handleEditReport,
}: {
  sortedReports: ResearcherReport[]
  user: any
  navigate: (path: string) => void
  handleValidateReport: (reportId: string, action: ValidationAction, notes?: string) => Promise<boolean>
  handleEditReport: (report: ResearcherReport) => void
}) {
  return (
    <ReportCenter
      reports={sortedReports}
      viewerRole={user?.role ?? null}
      viewerName={user?.name ?? null}
      viewerId={user?.id ?? null}
      onBrowsePrograms={() => navigate('/bounties')}
      onOpenProgram={(programId) => navigate('/bounty/' + programId)}
      onValidate={handleValidateReport}
      onEditReport={handleEditReport}
    />
  )
}

function AgentsDirectory({
  leaderboardAgents,
  openAgent,
}: {
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
}) {
  const sortedAgents = [...leaderboardAgents].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-8">
      <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Agent directory</p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
              The agents supporting triage, benchmarking, and submission workflows.
            </h1>
          </div>
          <Button variant="outline" size="md" onClick={() => openAgent('', '/agents/leaderboard')}>
            Open leaderboard
          </Button>
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
  topRankedAgent: any
  leaderboardAgents: Agent[]
  openAgent: (id: string, source: string) => void
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Agent leaderboard</p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
              Ranked agent performance.
            </h1>
          </div>
          <div className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Current champion</p>
            <p className="mt-3 text-2xl font-semibold text-[#171717]">{topRankedAgent?.name}</p>
          </div>
        </div>
      </section>
      <AgentLeaderboard
        agents={leaderboardAgents}
        onAgentClick={(id: string) => openAgent(id, '/agents/leaderboard')}
      />
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

  return (
    <AgentDetail agent={agent} linkedPrograms={agent.linkedPrograms || []} onBack={() => navigate(agentBackTarget)} />
  )
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
  const [isLoginOpen, setIsLoginOpen] = useState(false)

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
      setIsLoginOpen(true)
      return
    }

    try {
      if (editingReport) {
        const res = await api.patch<ResearcherReport>(`/reports/${editingReport.id}`, {
          title: submission.title,
          severity: submission.severity,
          target: submission.target,
          summary: submission.summary,
          impact: submission.impact,
          proof: submission.proof,
          codeSnippet: submission.codeSnippet,
          errorLocation: submission.errorLocation,
        })

        if (res.success) {
          setReports((current) => current.map((r) => (r.id === res.data.id ? res.data : r)))
          setIsSubmissionOpen(false)
          setEditingReport(null)
        } else {
          alert(res.error || 'Update failed')
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

  const handleValidateReport = async (reportId: string, action: ValidationAction, notes?: string) => {
    if (!user) {
      setIsLoginOpen(true)
      return false
    }

    try {
      const res = await api.post<ResearcherReport>(`/reports/${reportId}/validate`, {
        action,
        notes,
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

  const featuredPrograms = programs.filter((p) => p.isNew)
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
      const matchesCategory =
        selectedCategory === 'All categories' || (program.categories || []).includes(selectedCategory as never)
      const matchesPlatform =
        selectedPlatform === 'All platforms' || (program.platforms || []).includes(selectedPlatform as never)

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

  const liveSignals: any[] = []
  const leaderboardAgents = [...agents].sort((left, right) => {
    const rankDelta = (left.rank ?? 999) - (right.rank ?? 999)
    return rankDelta !== 0 ? rankDelta : left.name.localeCompare(right.name)
  })
  const sortedReports = [...reports].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  const topRankedAgent = leaderboardAgents[0]

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedKind('All kinds')
    setSelectedCategory('All categories')
    setSelectedPlatform('All platforms')
    setSortBy('recent')
  }

  return (
    <Shell
      navigation={
        <TopNav pathname={location.pathname} reportCount={reports.length} onLogin={() => setIsLoginOpen(true)} />
      }
    >
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
              handleEditReport={handleEditReport}
            />
          }
        />
        <Route
          path="/agents"
          element={<AgentsDirectory leaderboardAgents={leaderboardAgents} openAgent={openAgent} />}
        />
        <Route
          path="/agents/leaderboard"
          element={
            <AgentLeaderboardPage
              topRankedAgent={topRankedAgent}
              leaderboardAgents={leaderboardAgents}
              openAgent={openAgent}
            />
          }
        />
        <Route
          path="/bounty/:id"
          element={
            <ProgramDetailPage
              user={user}
              reports={reports}
              navigate={navigate}
              openSubmission={openSubmission}
              openAgent={openAgent}
            />
          }
        />
        <Route
          path="/bounty/:id/submission"
          element={
            <ProgramDetailPage
              user={user}
              reports={reports}
              navigate={navigate}
              openSubmission={openSubmission}
              openAgent={openAgent}
              initialTab="submission"
            />
          }
        />
        <Route
          path="/program/:id"
          element={
            <ProgramDetailPage
              user={user}
              reports={reports}
              navigate={navigate}
              openSubmission={openSubmission}
              openAgent={openAgent}
            />
          }
        />
        <Route
          path="/program/:id/submission"
          element={
            <ProgramDetailPage
              user={user}
              reports={reports}
              navigate={navigate}
              openSubmission={openSubmission}
              openAgent={openAgent}
              initialTab="submission"
            />
          }
        />
        <Route
          path="/agent/:id"
          element={<AgentDetailPage agentBackTarget={agentBackTarget} navigate={navigate} />}
        />
      </Routes>

      <SubmissionModal
        isOpen={isSubmissionOpen}
        programs={programs}
        initialProgramId={submissionProgramId}
        initialData={editingReport}
        onClose={closeSubmission}
        onSubmit={handleSubmitReport}
      />

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </Shell>
  )
}
