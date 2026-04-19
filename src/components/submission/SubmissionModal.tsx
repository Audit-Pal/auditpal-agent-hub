import { useEffect, useState, useMemo, useRef, type FormEvent, useCallback } from 'react'
import type { Program, ReportSubmissionInput, ResearcherReport } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { formatUsd } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { FindingCard, type FormVulnerability } from './FindingCard'

interface SubmissionModalProps {
  isOpen: boolean
  programs: readonly Program[]
  initialProgramId?: string | null
  initialData?: ResearcherReport | null
  onClose: () => void
  onLogin?: () => void
  onSubmit: (submission: ReportSubmissionInput) => void
}

interface FormState {
  programId: string
  title: string
  reporterAgent: string
  vulnerabilities: FormVulnerability[]
  agreedRules: boolean
}

function createDefaultVulnerability(selectedProgram: Program | null): FormVulnerability {
  const defaultTarget = selectedProgram?.scopeTargets?.[0]
  return {
    id: Math.random().toString(36).substr(2, 9),
    title: '',
    severity: 'MEDIUM',
    targetId: defaultTarget?.id ?? '',
    summary: '',
    impact: '',
    proof: '',
    vulnerabilityClass: '',
    affectedAsset: '',
    affectedComponent: '',
    attackVector: '',
    rootCause: '',
    prerequisites: '',
    codeSnippet: '',
    errorLocation: '',
  }
}

function createInitialState(programs: readonly Program[], programId?: string | null): FormState {
  const selectedProgram = programs.find((p) => p.id === programId) ?? programs[0]
  return {
    programId: selectedProgram?.id ?? '',
    title: '',
    reporterAgent: '',
    vulnerabilities: [createDefaultVulnerability(selectedProgram)],
    agreedRules: false,
  }
}

export function SubmissionModal({
  isOpen,
  programs,
  initialProgramId,
  initialData,
  onClose,
  onLogin,
  onSubmit,
}: SubmissionModalProps) {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(() => createInitialState(programs, initialProgramId))
  const [errors, setErrors] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [ownedAgents, setOwnedAgents] = useState<any[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const isEditing = !!initialData
  const selectedProgram = useMemo(() => programs.find((p) => p.id === form.programId) ?? programs[0], [programs, form.programId])
  const availableTargets = useMemo(() => selectedProgram?.scopeTargets || [], [selectedProgram])

  // Mount logic
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setMounted(true), 10)
    } else {
      setMounted(false)
    }
  }, [isOpen])

  // Sync initial data
  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      const sp = programs.find((p) => p.id === initialData.programId)
      setForm({
        programId: initialData.programId,
        title: initialData.title,
        reporterAgent: initialData.structuredData?.graphContext?.reporterAgent ?? '',
        vulnerabilities: initialData.vulnerabilities.map(v => ({
          id: v.id,
          title: v.title,
          severity: v.severity,
          targetId: sp?.scopeTargets?.find(t => t.label === v.target)?.id ?? '',
          summary: v.summary,
          impact: v.impact,
          proof: v.proof,
          codeSnippet: v.codeSnippet || '',
          errorLocation: v.errorLocation || '',
          vulnerabilityClass: '', affectedAsset: '', affectedComponent: '', attackVector: '', rootCause: '', prerequisites: ''
        })),
        agreedRules: true,
      })
    } else {
      setForm(createInitialState(programs, initialProgramId))
    }
  }, [isOpen, initialProgramId, initialData, programs])

  // Fetch agents for quick-select
  useEffect(() => {
    if (!isOpen || !user) return
    api.get<any[]>('/agents/mine').then(res => {
      if (res.success) setOwnedAgents(res.data)
    })
  }, [isOpen, user])

  const updateForm = useCallback((key: keyof FormState, value: any) => {
    setForm(c => ({ ...c, [key]: value }))
  }, [])

  const updateVulnerability = useCallback((id: string, key: keyof FormVulnerability, value: any) => {
    setForm(c => ({
      ...c,
      vulnerabilities: c.vulnerabilities.map(v => v.id === id ? { ...v, [key]: value } : v)
    }))
  }, [])

  const addVulnerability = () => {
    setForm(c => ({
      ...c,
      vulnerabilities: [...c.vulnerabilities, createDefaultVulnerability(selectedProgram)]
    }))
  }

  const removeVulnerability = (id: string) => {
    setForm(c => ({ ...c, vulnerabilities: c.vulnerabilities.filter(v => v.id !== id) }))
  }

  const handleMagicScan = async () => {
    const first = form.vulnerabilities[0]
    if (!first?.summary.trim() && !first?.codeSnippet.trim()) {
      setErrors(['Provide some context in the first finding for AI analysis.'])
      return
    }
    setIsGenerating(true)
    try {
      const res = await api.post<any>('/audit/generate', {
        code: first.codeSnippet,
        description: first.summary,
      })
      if (res.success && res.data) {
        const d = res.data
        updateVulnerability(first.id, 'title', d.title || first.title)
        updateVulnerability(first.id, 'severity', d.severity || first.severity)
        updateVulnerability(first.id, 'summary', d.summary || first.summary)
        updateVulnerability(first.id, 'impact', d.impact || first.impact)
        updateVulnerability(first.id, 'proof', d.proof || first.proof)
      }
    } catch {
      setErrors(['AI Scan failed. Please try manual entry.'])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: string[] = []
    if (!form.title.trim()) nextErrors.push('Title is required.')
    if (!form.reporterAgent.trim()) nextErrors.push('Reporting Agent name is required.')
    if (!form.agreedRules) nextErrors.push('You must agree to the program rules.')

    form.vulnerabilities.forEach((v, i) => {
      if (!v.title.trim()) nextErrors.push(`Finding #${i+1}: Title is required.`)
      if (!v.summary.trim()) nextErrors.push(`Finding #${i+1}: Summary is required.`)
    })

    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    onSubmit({
      programId: form.programId,
      reporterName: user?.name || 'Anonymous',
      title: form.title,
      vulnerabilities: form.vulnerabilities.map(v => ({
        title: v.title,
        severity: v.severity,
        target: selectedProgram.scopeTargets?.find(t => t.id === v.targetId)?.label || v.targetId,
        summary: v.summary,
        impact: v.impact,
        proof: v.proof,
        codeSnippet: v.codeSnippet,
        errorLocation: v.errorLocation,
      })),
      graphContext: {
        reporterAgent: form.reporterAgent,
      }
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div className={`sub-drawer-overlay ${mounted ? 'sub-drawer-overlay--in' : ''}`} onClick={onClose} />
      
      <div className={`sub-drawer ${mounted ? 'sub-drawer--in' : ''}`}>
        <header className="sub-drawer__header">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">
              {isEditing ? 'Edit Submission' : 'New Report'}
            </h2>
            <Badge tone="soft">{selectedProgram.name}</Badge>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div ref={contentRef} className="sub-drawer__content">
          {errors.length > 0 && (
            <div className="mb-8 p-4 rounded-xl bg-[var(--critical-soft)] border border-[var(--critical-text)]/20 animate-fade-in">
              <p className="text-xs font-bold text-[var(--critical-text)] uppercase tracking-tight mb-2">Required Fields Missing</p>
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-[13px] text-[var(--text-soft)] flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-[var(--critical-text)]" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form id="drawer-form" onSubmit={handleSubmit} className="space-y-10">
            {/* Context Section */}
            <section className="sub-section">
              <h3 className="sub-section__title">Report Context</h3>
              <div className="space-y-6">
                <label className="block space-y-2">
                  <span className="field-label">Submission Title *</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => updateForm('title', e.target.value)}
                    placeholder="e.g., Critical vulnerability in Rewards Vault"
                    className="field font-bold"
                  />
                </label>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="field-label">Reporting Agent / Alias *</span>
                    <input
                      type="text"
                      value={form.reporterAgent}
                      onChange={e => updateForm('reporterAgent', e.target.value)}
                      placeholder="Your hacker name"
                      className="field"
                    />
                    {ownedAgents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ownedAgents.slice(0, 3).map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => updateForm('reporterAgent', a.name)}
                            className={`px-2 py-1 rounded border text-[10px] font-bold transition-all ${
                              form.reporterAgent === a.name 
                              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                            }`}
                          >
                            {a.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>

                  <div className="space-y-2">
                    <span className="field-label">Bounty Target</span>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
                      <div className="h-8 w-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-bold">
                        {selectedProgram.logoMark || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text)] truncate">{selectedProgram.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{formatUsd(selectedProgram.maxBountyUsd)} Max</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Findings Section */}
            <section className="sub-section">
              <div className="flex items-center justify-between mb-6">
                <h3 className="sub-section__title mb-0">Vulnerabilities</h3>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleMagicScan}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Analyzing...' : 'AI Auto-Fill'}
                </Button>
              </div>

              <div className="space-y-6">
                {form.vulnerabilities.map((vuln, i) => (
                  <FindingCard
                    key={vuln.id}
                    vuln={vuln}
                    index={i}
                    availableTargets={availableTargets}
                    onUpdate={updateVulnerability}
                    onRemove={removeVulnerability}
                    canRemove={form.vulnerabilities.length > 1}
                  />
                ))}

                <button type="button" onClick={addVulnerability} className="sub-add-btn">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Another Finding
                </button>
              </div>
            </section>

            {/* Agreement */}
            <section className="pt-6 border-t border-[var(--border)]">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={form.agreedRules}
                    onChange={e => updateForm('agreedRules', e.target.checked)}
                    className="peer h-4 w-4 appearance-none rounded border border-[var(--border)] bg-[rgba(8,16,24,0.6)] checked:bg-[var(--accent)] transition-all"
                  />
                  <svg className="absolute left-[2px] top-[2px] h-3 w-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-[var(--accent-ink)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">I agree to the disclosure policy</p>
                  <p className="text-[11px] text-[var(--text-soft)] mt-0.5">I certify these findings were discovered fairly and within the provided scope.</p>
                </div>
              </label>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type={user ? 'submit' : 'button'}
                  variant="primary" 
                  size="lg" 
                  className="flex-[2]"
                  disabled={(!user && !onLogin) || isGenerating}
                  onClick={user ? undefined : onLogin}
                >
                  {isEditing ? 'Save Changes' : user ? 'Submit Report' : 'Log in to submit'}
                </Button>
              </div>
            </section>
          </form>
        </div>
      </div>
    </>
  )
}
