import { useSearchParams, Link } from 'react-router-dom'
import { ReportCenter } from '../submission/ReportCenter'
import { GatekeeperDashboard } from '../submission/GatekeeperDashboard'
import { ValidatorDashboard } from '../submission/ValidatorDashboard'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ResearcherReport, ValidationAction } from '../../types/platform'
import { PageHero } from '../common/PageHero'

interface ReportsPageProps {
  sortedReports: ResearcherReport[]
  user: any
  navigate: (path: string) => void
  handleValidateReport: (reportId: string, action: ValidationAction, notes?: string) => Promise<boolean>
  handleValidateVulnerability: (vulnId: string, action: ValidationAction, notes?: string, rewardAmount?: number) => Promise<boolean>
  handleEditReport: (report: ResearcherReport) => void
}

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: '#ff4646', bg: 'rgba(255,70,70,0.08)' },
  HIGH:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  MEDIUM:   { label: 'Medium',   color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  LOW:      { label: 'Low',      color: '#0fca8a', bg: 'rgba(15,202,138,0.08)' },
}

interface GuestBlock {
  id: string
  bountyName: string
  title: string
  severity: string
  status: string
  accepted: boolean
  submittedAt: string
  rewardEstimateUsd?: number | null
}

function GuestGlobalPool({ navigate }: { navigate: (path: string) => void }) {
  const [blocks, setBlocks] = useState<GuestBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<GuestBlock[]>('/reports/public').then((res) => {
      if (res.success) setBlocks(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const sev = (s: string) => SEVERITY_STYLES[s] || SEVERITY_STYLES.LOW

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHero
        eyebrow="Global Pool"
        title="Submissions"
        description="Public intelligence flowing out of the marketplace, from early signal to accepted findings."
        stats={[
          { label: 'Total Blocks', value: String(blocks.length) },
          { label: 'Accepted', value: String(blocks.filter((block) => block.accepted).length), tone: 'accent' },
        ]}
      />

      {/* CTA banner */}
      <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[rgba(15,202,138,0.15)] bg-[rgba(15,202,138,0.07)] px-5 py-4 backdrop-blur-[14px]">
        <div>
          <p className="text-[13px] font-bold text-[var(--text)]">Sign in to submit findings</p>
          <p className="text-[12px] text-[var(--text-soft)] mt-0.5">Track your queue, earn rewards, and build an on-chain reputation.</p>
        </div>
        <button onClick={() => navigate('/')} className="flex-shrink-0 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] border border-[rgba(15,202,138,0.3)] text-[#0fca8a] hover:bg-[rgba(15,202,138,0.1)] transition-colors rounded-lg">
          Get Access
        </button>
      </div>

      {/* Block grid */}
      {loading ? (
        <div className="text-center py-20 text-[var(--text-muted)] text-sm">Loading global pool…</div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] text-sm">No public signals available yet.</p>
          <Link to="/bounties" className="mt-4 inline-block text-[#0fca8a] text-sm hover:underline">Browse bounty programs →</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.06)] bg-[rgba(8,13,18,0.3)] backdrop-blur-[16px]">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_140px_100px_100px_100px] gap-4 px-4 pb-3 border-b border-[rgba(255,255,255,0.04)]">
            {['Bounty / Finding', 'Date', 'Complexity', 'Reward', 'Status'].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{h}</p>
            ))}
          </div>

          {blocks.map((block, idx) => {
            const s = sev(block.severity)
            return (
              <div
                key={block.id}
                className="group grid md:grid-cols-[1fr_140px_100px_100px_100px] gap-4 items-center px-4 py-4 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                {/* Bounty + title */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">#{String(idx + 1).padStart(4, '0')}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0fca8a] truncate">{block.bountyName}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--text)] truncate">{block.title}</p>
                </div>

                {/* Date */}
                <p className="text-[12px] text-[var(--text-soft)]">
                  {new Date(block.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Complexity */}
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: s.color, background: s.bg }}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Reward */}
                <p className="text-[13px] font-mono text-[var(--text-soft)]">
                  {block.rewardEstimateUsd ? `$${block.rewardEstimateUsd.toLocaleString()}` : '—'}
                </p>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${block.accepted ? 'bg-[#0fca8a]' : 'bg-[rgba(255,255,255,0.2)]'}`} />
                  <span className={`text-[11px] font-semibold ${block.accepted ? 'text-[#0fca8a]' : 'text-[var(--text-muted)]'}`}>
                    {block.accepted ? 'Accepted' : 'Pending'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ReportsPage({
  sortedReports,
  user,
  navigate,
  handleValidateReport,
  handleValidateVulnerability,
  handleEditReport,
}: ReportsPageProps) {
  const [searchParams] = useSearchParams()
  const filterProgramId = searchParams.get('programId')

  // Guest mode — show public global pool
  if (!user) {
    return <GuestGlobalPool navigate={navigate} />
  }

  const filteredReports = filterProgramId
    ? sortedReports.filter((report) => report.programId === filterProgramId)
    : sortedReports

  const openCount = filteredReports.filter((report) => !['ACCEPTED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'LOW_EFFORT'].includes(report.status)).length
  const closedCount = filteredReports.length - openCount
  const acceptedCount = filteredReports.filter((report) => ['ACCEPTED', 'RESOLVED'].includes(report.status)).length

  if (user?.role === 'GATEKEEPER') {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHero
          title="Review Signal"
          description="Escalate high-confidence findings, sort early-stage evidence, and keep the intake queue moving."
          stats={[
            { label: 'Reports in View', value: String(filteredReports.length) },
            { label: 'Awaiting Review', value: String(openCount), tone: 'accent' },
          ]}
        />
        <GatekeeperDashboard
          reports={filteredReports}
          onEscalate={(v) => handleValidateVulnerability(v.id, 'ESCALATE', '')}
          onReject={(v) => handleValidateVulnerability(v.id, 'REJECT', '')}
        />
      </div>
    )
  }

  if (user?.role === 'VALIDATOR') {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHero
          title="Finalize Reports"
          description="Confirm criticality, assign payout logic, and move accepted findings to their final outcome."
          stats={[
            { label: 'Reports in View', value: String(filteredReports.length) },
            { label: 'Ready to Close', value: String(closedCount), tone: 'soft' },
          ]}
        />
        <ValidatorDashboard reports={filteredReports} onValidate={(v, a, n, r) => handleValidateVulnerability(v.id, a, n, r)} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHero
        title="Submissions"
        description="Track new reports, active applications, and the next action needed across your bounty work."
        stats={[
          { label: 'Total Reports', value: String(filteredReports.length) },
          { label: 'Needs Action', value: String(openCount), tone: 'accent' },
          { label: 'Accepted / Resolved', value: String(acceptedCount), tone: 'soft' },
        ]}
      />

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
