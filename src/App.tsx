import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import type { ProgramKind, ResearcherReport, Program, Agent, ReportSubmissionInput, ValidationAction } from './types/platform'

import { Shell } from './components/layout/Shell'
import { TopNav } from './components/layout/TopNav'
import { SubmissionModal } from './components/submission/SubmissionModal'
import { LoginModal } from './components/auth/LoginModal'
import { RoleSelectionModal } from './components/auth/RoleSelectionModal'
import { OrgDashboard } from './components/organization/OrgDashboard'
import { BountyRegistration } from './components/organization/BountyRegistration'
import { ApiDocs } from './components/docs/ApiDocs'

import { HomePage } from './components/pages/HomePage'
import { ProgramsDirectoryPage } from './components/pages/ProgramsDirectoryPage'
import { ReportsPage } from './components/pages/ReportsPage'
import { AgentsDirectoryPage } from './components/pages/AgentsDirectoryPage'
import { AgentLeaderboardPage } from './components/pages/AgentLeaderboardPage'
import { ProgramDetailPage } from './components/pages/ProgramDetailPage'
import { AgentDetailPage } from './components/pages/AgentDetailPage'

import { api } from './lib/api'
import { useAuth } from './contexts/AuthContext'
import { useToast } from './contexts/ToastContext'

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

export default function App() {
  const { user } = useAuth()
  const { showToast } = useToast()
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
        if (res.error) {
          showToast(res.error, 'error')
        } else {
          showToast('Update failed', 'error')
        }
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
        showToast(res.error || 'Submission failed', 'error')
      }
      if (res.success) {
        showToast('Report submitted successfully!', 'success')
      }
    } catch (error) {
      console.error('Report submission failed', error)
      showToast('An unexpected error occurred during submission.', 'error')
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

      showToast(res.error || 'Validation failed', 'error')
    } catch (error) {
      console.error('Report validation failed', error)
      showToast('An unexpected error occurred during validation.', 'error')
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

      showToast(res.error || 'Validation failed', 'error')
    } catch (error) {
      console.error('Vulnerability validation failed', error)
      showToast('An unexpected error occurred during validation.', 'error')
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
      if (sortBy === 'bounty') return right.maxBountyUsd - left.maxBountyUsd
      if (sortBy === 'reviews') return right.scopeReviews - left.scopeReviews
      if (sortBy === 'name') return left.name.localeCompare(right.name)
      return right.updatedAt.localeCompare(left.updatedAt)
    })

  const totalPrograms = metrics?.programs?.total ?? 0
  const totalBountyCapacity = formatUsd(metrics?.programs?.totalBountyCapacityUsd ?? 0)
  const totalQueueItems = metrics?.reports?.total ?? 0
  const totalResearchersTouching = programs.reduce((total, program) => total + program.scopeReviews, 0).toLocaleString()

  const liveSignals: LiveSignal[] = programs
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
    <LazyMotion features={domAnimation} strict>
      <Shell navigation={<TopNav pathname={location.pathname} reportCount={reports.length} onLogin={handleOpenLogin} />}>
        <Routes>
        <Route
          path="/"
          element={
            <HomePage
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
            <ProgramsDirectoryPage
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
            <ProgramsDirectoryPage
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
            <ReportsPage
              sortedReports={sortedReports}
              user={user}
              navigate={navigate}
              handleValidateReport={handleValidateReport}
              handleValidateVulnerability={handleValidateVulnerability}
              handleEditReport={handleEditReport}
            />
          }
        />
        <Route path="/agents" element={<AgentsDirectoryPage leaderboardAgents={leaderboardAgents} openAgent={openAgent} navigate={navigate} />} />
        <Route path="/agents/leaderboard" element={<AgentLeaderboardPage topRankedAgent={topRankedAgent} leaderboardAgents={leaderboardAgents} openAgent={openAgent} />} />
        <Route path="/bounty/:id" element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} onLogin={handleOpenLogin} />} />
        <Route path="/bounty/:id/submission" element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} onLogin={handleOpenLogin} initialTab="submission" />} />
        <Route path="/program/:id" element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} onLogin={handleOpenLogin} />} />
        <Route path="/program/:id/submission" element={<ProgramDetailPage user={user} reports={reports} navigate={navigate} openSubmission={openSubmission} openAgent={openAgent} onLogin={handleOpenLogin} initialTab="submission" />} />
        <Route path="/agent/:id" element={<AgentDetailPage agentBackTarget={agentBackTarget} navigate={navigate} />} />
        <Route path="/org/dashboard" element={<OrgDashboard />} />
        <Route path="/org/register-bounty" element={<BountyRegistration />} />
        <Route path="/org/edit-bounty/:id" element={<BountyRegistration />} />
        <Route path="/docs" element={<ApiDocs />} />
      </Routes>

      <SubmissionModal isOpen={isSubmissionOpen} programs={programs} initialProgramId={submissionProgramId} initialData={editingReport} onClose={closeSubmission} onLogin={handleOpenLogin} onSubmit={handleSubmitReport} />

      <RoleSelectionModal isOpen={isRoleSelectionOpen} onSelectRole={handleRoleSelection} onClose={() => setIsRoleSelectionOpen(false)} />

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} initialRole={selectedRole} />
    </Shell>
    </LazyMotion>
  )
}
