import { useEffect, useState, type FormEvent } from 'react'
import type { Program, ReportSubmissionInput, Severity, ResearcherReport, Agent } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { getScopeTargetSelectionLabel } from '../../utils/scopeTargets'
import { formatEnum, formatUsd } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

interface SubmissionModalProps {
  isOpen: boolean
  programs: readonly Program[]
  initialProgramId?: string | null
  initialData?: ResearcherReport | null
  onClose: () => void
  onLogin?: () => void
  onSubmit: (submission: ReportSubmissionInput) => void
}

interface FormVulnerability {
  id: string
  title: string
  severity: Severity
  targetId: string
  summary: string
  impact: string
  proof: string
  vulnerabilityClass: string
  affectedAsset: string
  affectedComponent: string
  attackVector: string
  rootCause: string
  prerequisites: string
  codeSnippet: string
  errorLocation: string
}

interface FormState {
  programId: string
  title: string
  reporterAgent: string
  vulnerabilities: FormVulnerability[]
  referenceIds: string
  transactionHashes: string
  contractAddresses: string
  repositoryLinks: string
  filePaths: string
  tags: string
  agreedRules: boolean
  stayedInScope: boolean
}

interface SubmissionAgentOption {
  id: string
  name: string
  logoMark: string
  headline: string
  capabilities?: readonly string[]
}

function splitMultiValueField(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
}

function buildKnowledgeGraph(form: FormState, selectedProgram: Program, reporterName: string) {
  const programId = `program:${selectedProgram.id}`
  const reporterId = `reporter:${slugify(reporterName)}`
  const agentId = form.reporterAgent.trim() ? `agent:${slugify(form.reporterAgent)}` : null

  const entities: any[] = [
    {
      id: programId,
      type: 'Program',
      name: selectedProgram.name,
      properties: { code: selectedProgram.code },
    },
    {
      id: reporterId,
      type: 'Reporter',
      name: reporterName,
    },
    ...(agentId ? [{ id: agentId, type: 'Agent', name: form.reporterAgent.trim() }] : []),
  ]

  const relations: any[] = []

  form.vulnerabilities.forEach((vuln) => {
    const findingId = `finding:${slugify(vuln.title)}`
    const targetLabel = selectedProgram.scopeTargets?.find(t => t.id === vuln.targetId)?.label || vuln.targetId
    const targetId = `target:${slugify(targetLabel)}`
    
    entities.push(
      {
        id: findingId,
        type: 'Finding',
        name: vuln.title.trim(),
        properties: { severity: vuln.severity, summary: vuln.summary.trim(), impact: vuln.impact.trim(), proof: vuln.proof.trim() },
      },
      { id: targetId, type: 'Target', name: targetLabel },
    )

    relations.push(
      { sourceId: findingId, targetId: programId, type: 'BELONGS_TO_PROGRAM' },
      { sourceId: findingId, targetId, type: 'TARGETS' },
      { sourceId: findingId, targetId: reporterId, type: 'REPORTED_BY' },
    )
    if (agentId) {
      relations.push({ sourceId: findingId, targetId: agentId, type: 'DETECTED_WITH_AGENT' })
    }
  })

  // Deduplicate entities and relations
  const uniqueEntities = Array.from(new Map(entities.map(e => [e.id, e])).values())
  const uniqueRelations = Array.from(new Map(relations.map(r => [`${r.sourceId}-${r.targetId}-${r.type}`, r])).values())

  return { entities: uniqueEntities, relations: uniqueRelations }
}

function createDefaultVulnerability(selectedProgram: Program | null): FormVulnerability {
  const defaultTarget = selectedProgram?.scopeTargets?.[0]
  return {
    id: Math.random().toString(36).substr(2, 9),
    title: 'Precision loss in fee distribution during settlement',
    severity: 'HIGH',
    targetId: defaultTarget?.id ?? '',
    summary: 'A mathematical precision error in the settlement logic allows users to bypass fee collection by splitting transactions into smaller chunks below the wei threshold.',
    impact: 'Loss of protocol revenue and potential drain of settlement treasury over multiple small-scale transactions.',
    proof: '1. Deploy MockVault.sol\n2. Call distribute(1e9) with 0.1% fee\n3. Observe rounding down to zero\n4. Repeat 1000x to drain total reserves.',
    vulnerabilityClass: 'Mathematical precision error',
    affectedAsset: selectedProgram?.name ?? 'Protocol Core',
    affectedComponent: defaultTarget?.label ?? 'SettlementEngine.sol',
    attackVector: 'Rounding error in fixed-point arithmetic',
    rootCause: 'Using division before multiplication in the fee calculation block.',
    prerequisites: 'Minimal liquidity threshold in the settlement pool.',
    codeSnippet: 'function calculateFee(uint256 amount) public pure returns (uint256) {\n  return amount / 1000 * FEE_BPS; // Vulnerable: division before multiplication\n}',
    errorLocation: 'SettlementEngine.sol:45',
  }
}

function createInitialState(programs: readonly Program[], programId?: string | null): FormState {
  const selectedProgram = programs.find((program) => program.id === programId) ?? programs[0]

  return {
    programId: selectedProgram?.id ?? '',
    title: 'Comprehensive security analysis and aggregated findings',
    reporterAgent: '',
    vulnerabilities: [createDefaultVulnerability(selectedProgram)],
    referenceIds: 'REF-882, SEC-101',
    transactionHashes: '0xabc123...',
    contractAddresses: '0x123...abc (Testnet)',
    repositoryLinks: 'https://github.com/auditpal/core-contracts',
    filePaths: 'contracts/SettlementEngine.sol',
    tags: 'math, rounding, gas-optimization',
    agreedRules: true,
    stayedInScope: true,
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
  const [simPhase, setSimPhase] = useState<'none' | 'discovery' | 'source' | 'audit'>('none')
  const [programDetail, setProgramDetail] = useState<Program | null>(null)
  const [isLoadingProgramDetail, setIsLoadingProgramDetail] = useState(false)
  const [ownedAgents, setOwnedAgents] = useState<SubmissionAgentOption[]>([])
  const [isLoadingOwnedAgents, setIsLoadingOwnedAgents] = useState(false)

  const isEditing = !!initialData

  const programSummary = programs.find((program) => program.id === form.programId) ?? programs[0]
  const selectedProgram = programDetail?.id === form.programId ? programDetail : programSummary
  const availableTargets = selectedProgram?.scopeTargets || []
  const selectedAgent = ownedAgents.find((agent) => agent.name === form.reporterAgent)

  useEffect(() => {
    if (!isOpen) return

    if (initialData) {
      const selectedProgram = programs.find((p) => p.id === initialData.programId)
      const graphContext = initialData.structuredData?.graphContext

      setForm({
        programId: initialData.programId,
        title: initialData.title,
        reporterAgent: graphContext?.reporterAgent ?? '',
        vulnerabilities: initialData.vulnerabilities?.length > 0 ? initialData.vulnerabilities.map(v => ({
            id: v.id,
            title: v.title,
            severity: v.severity,
            targetId: selectedProgram?.scopeTargets?.find((t) => t.label === v.target)?.id ?? '',
            summary: v.summary,
            impact: v.impact,
            proof: v.proof,
            codeSnippet: v.codeSnippet || '',
            errorLocation: v.errorLocation || '',
            vulnerabilityClass: 'Unknown',
            affectedAsset: 'Unknown',
            affectedComponent: 'Unknown',
            attackVector: 'Unknown',
            rootCause: 'Unknown',
            prerequisites: 'Unknown'
        })) : [createDefaultVulnerability(selectedProgram!)],
        referenceIds: (graphContext?.referenceIds || []).join(', '),
        transactionHashes: (graphContext?.transactionHashes || []).join(', '),
        contractAddresses: (graphContext?.contractAddresses || []).join(', '),
        repositoryLinks: (graphContext?.repositoryLinks || []).join(', '),
        filePaths: (graphContext?.filePaths || []).join(', '),
        tags: (graphContext?.tags || []).join(', '),
        agreedRules: true,
        stayedInScope: true,
      })
    } else {
      setForm(createInitialState(programs, initialProgramId))
    }

    setErrors([])
    setIsGenerating(false)
    setSimPhase('none')
    setProgramDetail(null)
  }, [initialProgramId, isOpen, programs, initialData])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !form.programId) return

    let cancelled = false
    setIsLoadingProgramDetail(true)

    api.get<Program>(`/programs/${form.programId}`)
      .then((res) => {
        if (cancelled) return
        setProgramDetail(res.success ? res.data : null)
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to fetch submission program detail', error)
          setProgramDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProgramDetail(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [form.programId, isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (!user) {
      setOwnedAgents([])
      setIsLoadingOwnedAgents(false)
      return
    }

    let cancelled = false
    setIsLoadingOwnedAgents(true)

    api.get<SubmissionAgentOption[]>('/agents/mine')
      .then((res) => {
        if (cancelled) return
        setOwnedAgents(res.success ? res.data : [])
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to fetch hunter agents for submission', error)
          setOwnedAgents([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOwnedAgents(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, user?.id])

  useEffect(() => {
    if (!isOpen) return
    if (ownedAgents.length === 0) return
    if (ownedAgents.some((agent) => agent.name === form.reporterAgent)) return

    setForm((current) => ({
      ...current,
      reporterAgent: ownedAgents[0].name,
    }))
  }, [form.reporterAgent, isOpen, ownedAgents])

  if (!isOpen || !selectedProgram) {
    return null
  }

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateVulnerability = (id: string, key: keyof FormVulnerability, value: any) => {
    setForm(current => ({
        ...current,
        vulnerabilities: current.vulnerabilities.map(v => v.id === id ? { ...v, [key]: value } : v)
    }))
  }

  const addVulnerability = () => {
    setForm(current => ({
        ...current,
        vulnerabilities: [...current.vulnerabilities, createDefaultVulnerability(selectedProgram)]
    }))
  }

  const removeVulnerability = (id: string) => {
    setForm(current => ({
        ...current,
        vulnerabilities: current.vulnerabilities.filter(v => v.id !== id)
    }))
  }

  const handleMagicScan = async () => {
    if (!form.vulnerabilities[0]?.codeSnippet.trim() && !form.vulnerabilities[0]?.summary.trim()) {
      setErrors(['Please provide a code snippet or a brief description for the AI to analyze in the first finding.'])
      return
    }

    setIsGenerating(true)
    setErrors([])

    setSimPhase('discovery')
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSimPhase('source')
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSimPhase('audit')

    try {
      const res = await api.post<any>('/audit/generate', {
        code: form.vulnerabilities[0].codeSnippet,
        description: form.vulnerabilities[0].summary,
      })

      if (res.success && res.data) {
        const data = res.data
        updateVulnerability(form.vulnerabilities[0].id, 'title', data.title || form.vulnerabilities[0].title)
        updateVulnerability(form.vulnerabilities[0].id, 'severity', data.severity || form.vulnerabilities[0].severity)
        updateVulnerability(form.vulnerabilities[0].id, 'summary', data.summary || form.vulnerabilities[0].summary)
        updateVulnerability(form.vulnerabilities[0].id, 'impact', data.impact || form.vulnerabilities[0].impact)
        updateVulnerability(form.vulnerabilities[0].id, 'proof', data.proof || form.vulnerabilities[0].proof)
      }
    } catch {
      setErrors(['Failed to generate AI audit. Please check your connection or try again later.'])
    } finally {
      setIsGenerating(false)
      setSimPhase('none')
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const basicErrors = [
      !form.reporterAgent.trim() && 'Choose one of your registered hunter agents before submitting.',
      form.title.trim().length < 5 && 'Add an overall submission title.',
      !form.agreedRules && 'Confirm compliance.',
    ].filter(Boolean) as string[]

    const vulnErrors = form.vulnerabilities.flatMap((v, idx) => [
        !v.targetId.trim() && `Finding #${idx + 1}: Choose the affected target.`,
        v.title.trim().length < 5 && `Finding #${idx + 1}: Add a finding title.`,
        v.summary.trim().length < 10 && `Finding #${idx + 1}: Describe the issue.`,
        v.impact.trim().length < 5 && `Finding #${idx + 1}: Explain the impact.`,
        v.proof.trim().length < 5 && `Finding #${idx + 1}: Include proof.`,
    ]).filter(Boolean) as string[]

    const nextErrors = [...basicErrors, ...vulnErrors]

    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors([])

    const knowledgeGraph = buildKnowledgeGraph(form, selectedProgram, user?.name || 'Anonymous')

    onSubmit({
      programId: form.programId,
      reporterName: user?.name || 'Anonymous',
      title: form.title.trim(),
      source: 'CROWD_REPORT',
      vulnerabilities: form.vulnerabilities.map(v => {
         const targetLabel = selectedProgram.scopeTargets?.find(t => t.id === v.targetId)?.label || v.targetId
         return {
            title: v.title.trim(),
            severity: v.severity,
            target: targetLabel,
            summary: v.summary.trim(),
            impact: v.impact.trim(),
            proof: v.proof.trim(),
            codeSnippet: v.codeSnippet.trim() || undefined,
            errorLocation: v.errorLocation.trim() || undefined,
         }
      }),
      graphContext: {
        reporterAgent: form.reporterAgent.trim() || undefined,
        referenceIds: splitMultiValueField(form.referenceIds),
        transactionHashes: splitMultiValueField(form.transactionHashes),
        contractAddresses: splitMultiValueField(form.contractAddresses),
        repositoryLinks: splitMultiValueField(form.repositoryLinks),
        filePaths: splitMultiValueField(form.filePaths),
        tags: splitMultiValueField(form.tags),
      },
      knowledgeGraph,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(3,8,12,0.85)] px-4 py-6 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div className="mx-auto max-w-7xl animate-scale-in" onClick={(event) => event.stopPropagation()}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form
            onSubmit={handleSubmit}
            className="hero-card rounded-[42px] border border-[rgba(0,212,168,0.18)] bg-[rgba(9,18,27,0.96)] p-6 shadow-[0_48px_120px_rgba(0,0,0,0.8)] md:p-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(80,120,130,0.14)] pb-8">
              <div className="max-w-2xl">
                <p className="section-kicker">
                  Bounty submission
                </p>
                <h2 className="mt-4 font-serif text-4xl leading-tight text-[var(--text)] md:text-5xl">
                  {isEditing ? 'Edit your report' : 'Submit a multi-finding report'}
                </h2>
                <p className="section-copy mt-4 max-w-xl text-lg opacity-90">
                  {isEditing
                    ? 'Update your findings and save changes.'
                    : 'A single submission can contain multiple vulnerabilities. Complete the structured fields for each finding.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {isGenerating && (
                  <div className="hidden border-r border-[rgba(80,120,130,0.14)] pr-6 md:flex md:items-center md:gap-8">
                    <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${simPhase === 'discovery' ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)] border border-[rgba(0,212,168,0.2)] shadow-glow">AT</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">Discovery</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${simPhase === 'source' ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(139,92,246,0.1)] text-[10px] font-bold text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]">MS</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#a78bfa]">Provenance</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${simPhase === 'audit' ? 'scale-110 opacity-100' : 'opacity-30'}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.1)] text-[10px] font-bold text-[#f97316] border border-[rgba(249,115,22,0.2)]">OD</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#fb923c]">AI Audit</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  <Button type="button" variant="primary" size="md" onClick={handleMagicScan} disabled={isGenerating} className="animate-glow">
                    <svg className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {isGenerating ? 'Agents working...' : 'Magic AI Scan'}
                  </Button>
                  <Button type="button" variant="ghost" size="md" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-8 rounded-3xl border border-[rgba(255,80,80,0.2)] bg-[rgba(255,80,80,0.06)] p-6">
                <p className="text-sm font-bold text-[var(--critical-text)]">Please fix the following:</p>
                <ul className="mt-3 space-y-1.5 text-[13px] text-[rgba(255,128,128,0.85)]">
                  {errors.map((error, i) => (
                    <li key={i} className="flex items-start gap-2">
                       <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--critical-text)]" />
                       {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10 space-y-12">
              <section className="space-y-6">
                  <label className="block space-y-2">
                      <span className="field-label">Overall Submission Title</span>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) => updateForm('title', event.target.value)}
                        placeholder="E.g., Multiple Critical Flaws in Settlement Engine"
                        className="field"
                      />
                  </label>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="field-label">Bounty program</span>
                      {initialProgramId ? (
                        <div className="surface-card-muted flex min-h-[50px] items-center rounded-2xl border border-[rgba(80,120,130,0.2)] px-4 text-sm font-semibold text-[var(--text)]">
                          {selectedProgram.name}
                        </div>
                      ) : (
                        <select
                          value={form.programId}
                          onChange={(event) => {
                            setForm((current) => ({
                              ...current,
                              programId: event.target.value,
                              reporterAgent: '',
                            }))
                          }}
                          className="field-select"
                        >
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
              </section>

              <section className="surface-card-strong rounded-[32px] border border-[rgba(80,120,130,0.18)] bg-[rgba(10,24,34,0.4)] p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-serif text-2xl text-[var(--text)]">Choose one of your registered hunter agents</h3>
                  {isLoadingOwnedAgents && (
                    <div className="animate-pulse rounded-full border border-[var(--border)] bg-[rgba(8,16,24,0.6)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Scanning for agents...
                    </div>
                  )}
                </div>

                {ownedAgents.length > 0 ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {ownedAgents.map((agent) => {
                      const isSelected = form.reporterAgent === agent.name
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => updateForm('reporterAgent', agent.name)}
                          className={`group relative flex items-start gap-4 overflow-hidden rounded-[24px] border border-[rgba(80,120,130,0.18)] p-5 text-left transition-all duration-300 ${isSelected ? 'border-[var(--accent)] bg-[rgba(0,212,168,0.08)] ring-1 ring-[var(--accent)]' : 'bg-[rgba(8,16,24,0.6)] hover:border-[rgba(0,212,168,0.4)] hover:bg-[rgba(12,24,34,0.8)]'}`}
                        >
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition-colors ${isSelected ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[rgba(80,120,130,0.12)] text-[var(--text-soft)]'}`}>
                            {agent.logoMark || '🤖'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold tracking-tight text-[var(--text)]">{agent.name}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-soft)] opacity-80">{agent.headline}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute right-4 top-4">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-[rgba(80,120,130,0.14)] bg-[rgba(8,16,24,0.6)] p-6 text-center">
                    <p className="text-sm leading-7 text-[var(--text-soft)] opacity-80">
                      {user ? (
                        "You don't have any registered agents yet."
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={onLogin}
                            className="font-bold text-[var(--accent)] hover:underline"
                          >
                            Log in
                          </button>{' '}
                          to access your registered security agents.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </section>

              
              {form.vulnerabilities.map((vuln, index) => (
                  <section key={vuln.id} className="surface-card rounded-[32px] border border-[rgba(80,120,130,0.18)] p-6 md:p-8 animate-fade-up relative">
                    <div className="flex items-center justify-between pb-6 border-b border-[rgba(80,120,130,0.12)]">
                        <h3 className="font-serif text-3xl text-[var(--text)]">Finding #{index + 1}</h3>
                        {form.vulnerabilities.length > 1 && (
                            <button type="button" onClick={() => removeVulnerability(vuln.id)} className="text-sm font-bold text-[var(--critical-text)] hover:underline opacity-80 hover:opacity-100 transition-opacity">
                                Remove finding
                            </button>
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] mt-8">
                        <label className="space-y-2">
                            <span className="field-label">Finding title</span>
                            <input
                                type="text"
                                value={vuln.title}
                                onChange={(e) => updateVulnerability(vuln.id, 'title', e.target.value)}
                                placeholder="Brief description of the finding"
                                className="field"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="field-label">Severity</span>
                            <select
                                value={vuln.severity}
                                onChange={(e) => updateVulnerability(vuln.id, 'severity', e.target.value as Severity)}
                                className="field-select"
                            >
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </label>
                    </div>

                    <label className="block space-y-2 mt-6">
                        <span className="field-label">Target component</span>
                        <select
                            value={vuln.targetId}
                            onChange={(event) => updateVulnerability(vuln.id, 'targetId', event.target.value)}
                            disabled={availableTargets.length === 0}
                            className="field-select"
                        >
                            {availableTargets.length === 0 ? (
                                <option value="">No scoped targets available</option>
                            ) : (
                                availableTargets.map((target) => (
                                    <option key={target.id} value={target.id}>
                                        {getScopeTargetSelectionLabel(target)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>

                    <div className="space-y-6 mt-8">
                        <label className="block space-y-2">
                          <p className="field-label">Summary</p>
                          <textarea
                              rows={3}
                              value={vuln.summary}
                              onChange={(e) => updateVulnerability(vuln.id, 'summary', e.target.value)}
                              className="field-area"
                          />
                        </label>

                        <label className="block space-y-2">
                          <p className="field-label">Impact</p>
                          <textarea
                              rows={3}
                              value={vuln.impact}
                              onChange={(e) => updateVulnerability(vuln.id, 'impact', e.target.value)}
                              className="field-area"
                          />
                        </label>

                        <label className="block space-y-2">
                          <p className="field-label">Proof of concept</p>
                          <textarea
                              rows={4}
                              value={vuln.proof}
                              onChange={(e) => updateVulnerability(vuln.id, 'proof', e.target.value)}
                              className="field-area"
                          />
                        </label>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] mt-8 pt-8 border-t border-[rgba(80,120,130,0.12)]">
                        <label className="space-y-2">
                            <span className="field-label">Error location</span>
                            <input
                                type="text"
                                value={vuln.errorLocation}
                                onChange={(e) => updateVulnerability(vuln.id, 'errorLocation', e.target.value)}
                                placeholder="File.sol:123"
                                className="field"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="field-label">Vulnerable snippet</span>
                            <textarea
                                rows={6}
                                value={vuln.codeSnippet}
                                onChange={(e) => updateVulnerability(vuln.id, 'codeSnippet', e.target.value)}
                                placeholder="// Paste the vulnerable code snippet here"
                                className="field-area bg-[rgba(3,8,12,0.4)] font-mono text-[13px] border-[rgba(80,120,130,0.3)] placeholder:opacity-30"
                            />
                        </label>
                    </div>
                  </section>
              ))}

              <div className="flex justify-center pt-4 pb-10 border-b border-[rgba(80,120,130,0.14)]">
                  <Button type="button" variant="outline" size="lg" onClick={addVulnerability} className="border-dashed border-[rgba(80,120,130,0.3)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add another finding to this submission
                  </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-6 mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="agreed"
                      checked={form.agreedRules}
                      onChange={(event) => updateForm('agreedRules', event.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-[rgba(8,16,24,0.6)] checked:bg-[var(--accent)] transition-all"
                    />
                    <svg className="absolute left-1 top-1 h-3 w-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-[var(--accent-ink)] transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <label htmlFor="agreed" className="cursor-pointer text-sm font-medium text-[var(--text-soft)]">
                    I confirm these findings were discovered fairly and stay within scope.
                  </label>
                </div>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" size="lg" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={!form.reporterAgent.trim() || isGenerating}
                    className="min-w-[200px]"
                  >
                    {isEditing
                      ? 'Save changes'
                      : user
                      ? 'Submit multiple findings'
                      : (
                        <span onClick={(e) => { e.stopPropagation(); onLogin?.(); }}>
                          Log in to submit
                        </span>
                      )}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="surface-card-strong rounded-[36px] border border-[rgba(80,120,130,0.18)] bg-[rgba(9,18,27,0.98)] p-8 shadow-xl">
              <p className="section-kicker">
                Bounty context
              </p>
              <h3 className="mt-4 font-serif text-3xl text-[var(--text)] leading-tight">{selectedProgram.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)] opacity-90">{selectedProgram.tagline}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(selectedProgram.categories || []).map((category) => (
                  <Badge key={category} tone="soft">
                    {formatEnum(category)}
                  </Badge>
                ))}
              </div>
              <div className="mt-8 grid gap-4">
                <div className="surface-card-muted rounded-[24px] border border-[rgba(80,120,130,0.12)] p-5">
                  <p className="section-kicker text-[8px]">Max bounty</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text)]">{formatUsd(selectedProgram.maxBountyUsd)}</p>
                </div>
                <div className="surface-card-muted rounded-[24px] border border-[rgba(80,120,130,0.12)] p-5">
                  <p className="section-kicker text-[8px]">Payout window</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text)]">{selectedProgram.payoutWindow || '7 days'}</p>
                </div>
              </div>
            </section>

            <section className="surface-card-strong rounded-[36px] border border-[rgba(80,120,130,0.18)] bg-[rgba(9,18,27,0.98)] p-8 shadow-xl">
              <p className="section-kicker">
                Selected agent
              </p>
              {selectedAgent ? (
                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[var(--accent-soft)] text-3xl text-[var(--accent)] border border-[rgba(0,212,168,0.2)] mb-4">
                    {selectedAgent.logoMark || '🤖'}
                  </div>
                  <h4 className="text-xl font-bold text-[var(--text)]">{selectedAgent.name}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">{selectedAgent.headline}</p>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-[rgba(80,120,130,0.2)] p-8 text-center bg-[rgba(8,16,24,0.4)]">
                   <p className="text-sm leading-relaxed text-[var(--text-soft)] italic opacity-70">
                     Choose one of your registered hunter agents before you submit the report.
                   </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
