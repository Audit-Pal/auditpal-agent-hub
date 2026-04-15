import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { MetricCard } from '../common/MetricCard'
import { api } from '../../lib/api'
import type { Program } from '../../types/platform'
import { useAuth } from '../../contexts/AuthContext'

const stagger = {
  container: { 
    hidden: {}, 
    show: { 
      transition: { 
        staggerChildren: 0.05,
        delayChildren: 0.05
      } 
    } 
  },
  item: { 
    hidden: { opacity: 0, y: 16 }, 
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.4, 
        ease: [0.22, 1, 0.36, 1] 
      } 
    } 
  },
}

export function OrgDashboard() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [fundAmounts, setFundAmounts] = useState<Record<string, number>>({})
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const res = await api.get<Program[]>('/programs/mine')
      if (res.success) {
        setPrograms(res.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleFund = useCallback(async (id: string) => {
    const amount = fundAmounts[id]
    if (!amount || amount <= 0) {
      alert('Please enter a valid funding amount.')
      return
    }
    setProcessingIds((prev) => new Set(prev).add(id))
    try {
      const res = await api.post(`/programs/${id}/fund`, { amount })
      if (res.success) {
        alert('Program funded and activated!')
        fetchPrograms()
      } else {
        alert(res.error || 'Funding failed')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [fundAmounts])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this program?')) return
    setProcessingIds((prev) => new Set(prev).add(id))
    try {
      const res = await api.delete(`/programs/${id}`)
      if (res.success) {
        fetchPrograms()
      } else {
        alert('Failed to delete program: ' + res.error)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const handleArchive = useCallback(async (id: string) => {
    if (!confirm('Archive this program? It will no longer be visible.')) return
    setProcessingIds((prev) => new Set(prev).add(id))
    try {
      const res = await api.patch(`/programs/${id}`, { status: 'CLOSED', isPublished: false })
      if (res.success) {
        fetchPrograms()
      } else {
        alert('Failed to archive program: ' + res.error)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const { activePrograms, draftPrograms, totalApplications } = useMemo(() => {
    const active = programs.filter((p) => p.status === 'ACTIVE')
    const draft = programs.filter((p) => p.status !== 'ACTIVE' && p.status !== 'CLOSED')
    const apps = programs.reduce((sum, p) => sum + ((p as any)._count?.reports || 0), 0)
    return { activePrograms: active.length, draftPrograms: draft.length, totalApplications: apps }
  }, [programs])

  if (!loading && user?.role !== 'ORGANIZATION') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card-strong flex flex-col items-center justify-center rounded-[34px] py-20 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--critical-soft)] border border-[rgba(181,69,52,0.2)] mb-6">
          <svg className="h-10 w-10 text-[var(--critical-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-serif text-[var(--text)]">Access restricted</h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--text-soft)]">
          Only organization accounts can access this workspace. Please log in with an organization account or create one.
        </p>
        <Link to="/" className="mt-6">
          <Button variant="outline" size="md">Return home</Button>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="space-y-8 animate-fade-in"
    >
      <motion.section 
        variants={stagger.item}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.3 }}
        className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12"
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <p className="section-kicker">Organization workspace</p>
            <h1 className="section-title mt-4 max-w-4xl">Launch programs, activate funding, and keep applications moving.</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              The organization experience is streamlined: onboard a program, assign reviewers, fund the campaign,
              and jump directly into application management when the queue starts moving.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/org/register-bounty">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="primary" size="lg">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Register new bounty
                  </Button>
                </motion.div>
              </Link>
              <Link to="/reports">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="lg">View all applications</Button>
                </motion.div>
              </Link>
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Total programs" value={programs.length} note="All campaigns owned by your organization" accent="var(--accent)" />
            <MetricCard label="Active now" value={activePrograms} note="Live programs visible to researchers" accent="var(--accent-strong)" />
            <MetricCard label="In draft" value={draftPrograms} note="Programs awaiting funding or configuration" />
            <MetricCard label="Applications" value={totalApplications} note="Total submissions across all programs" />
          </aside>
        </div>
      </motion.section>

      <motion.div variants={stagger.item} className="grid gap-6">
        {loading ? (
          <div className="surface-card-strong rounded-[32px] p-12 text-center">
            <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
            <p className="mt-4 text-sm text-[var(--text-soft)]">Loading programs...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="surface-card-strong rounded-[32px] p-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)] mx-auto mb-6">
              <svg className="h-10 w-10 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="section-kicker">No programs yet</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">Your organization hasn't launched a program yet.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-soft)]">
              Start with the guided onboarding flow to configure rewards, scope references, reviewer roles, and launch timing.
            </p>
            <Link to="/org/register-bounty" className="mt-6 inline-block">
              <Button variant="primary" size="lg">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Register your first bounty
              </Button>
            </Link>
          </div>
        ) : (
          programs.map((program) => {
            const isProcessing = processingIds.has(program.id)
            return (
              <motion.article
                key={program.id}
                variants={stagger.item}
                whileHover={{ scale: 1.01, y: -3 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="surface-card-strong rounded-[32px] p-6 md:p-8"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#0f766e,#0b5f61)] text-2xl font-extrabold text-white shadow-[0_18px_34px_rgba(15,118,110,0.24)]">
                      {program.logoMark}
                    </div>
                    <div className="space-y-3 flex-1 min-w-0">
                      <div>
                        <h3 className="text-2xl font-extrabold tracking-[-0.04em] text-[var(--text)] break-words">{program.name}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-soft)] line-clamp-2">{program.tagline}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="soft">{program.code}</Badge>
                        <Badge tone={program.status === 'ACTIVE' ? 'success' : program.status === 'CLOSED' ? 'medium' : 'accent'}>
                          {program.status === 'ACTIVE' ? 'Live' : program.status === 'CLOSED' ? 'Archived' : 'Draft'}
                        </Badge>
                        <Badge tone="accent">{(program as any)._count?.reports || 0} applications</Badge>
                        <Badge tone="soft">${program.maxBountyUsd.toLocaleString()} max</Badge>
                        {(program as any).publishedAt && (
                          <span className="summary-chip">
                            Live since {new Date((program as any).publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:w-[420px]">
                    {program.status !== 'ACTIVE' && program.status !== 'CLOSED' && (
                      <div className="surface-card-muted rounded-[24px] p-4">
                        <label className="field-label">Fund to activate</label>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <div className="relative min-w-[160px] flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">$</span>
                            <input
                              type="number"
                              placeholder="Amount"
                              value={fundAmounts[program.id] || ''}
                              onChange={(event) => setFundAmounts((current) => ({ ...current, [program.id]: Number(event.target.value) }))}
                              className="field !pl-8"
                              disabled={isProcessing}
                            />
                          </div>
                          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleFund(program.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? 'Processing...' : 'Activate'}
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/reports?programId=${program.id}`} className="flex-1 min-w-[140px]">
                        <Button variant="outline" size="md" className="w-full">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                          </svg>
                          Applications
                        </Button>
                      </Link>
                      <Link to={`/org/edit-bounty/${program.id}`}>
                        <Button variant="ghost" size="md" className="border border-[var(--border)]" disabled={isProcessing}>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </Link>
                      {program.status !== 'CLOSED' && (
                        <Button
                          variant="ghost"
                          size="md"
                          className="border border-[var(--border)]"
                          onClick={() => handleArchive(program.id)}
                          disabled={isProcessing}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4" />
                          </svg>
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="md"
                        className="border border-[rgba(181,69,52,0.14)] bg-[var(--critical-soft)] text-[var(--critical-text)] hover:bg-[var(--critical-soft)]"
                        onClick={() => handleDelete(program.id)}
                        disabled={isProcessing}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          })
        )}
      </motion.div>
    </motion.div>
  )
}
