import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProgramDetail } from '../detail/ProgramDetail'
import { api } from '../../lib/api'
import type { Program, ProgramTab, ResearcherReport } from '../../types/platform'

interface ProgramDetailPageProps {
  user: any
  reports: ResearcherReport[]
  navigate: (path: string) => void
  openSubmission: (programId?: string | null) => void
  openAgent: (id: string, source: string) => void
  onLogin: () => void
  initialTab?: ProgramTab
}

export function ProgramDetailPage({ user, reports, navigate, openSubmission, openAgent, onLogin, initialTab = 'overview' }: ProgramDetailPageProps) {
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
      onLogin={onLogin}
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
