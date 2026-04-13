import { useEffect, useState, type FormEvent } from 'react'
import type { Program, ReportSubmissionInput, Severity, ResearcherReport } from '../../types/platform'
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
    const vulnerabilityId = `vulnerability:${slugify(vuln.vulnerabilityClass)}`
    const componentId = `component:${slugify(vuln.affectedComponent)}`
    const assetId = `asset:${slugify(vuln.affectedAsset)}`

    entities.push(
      {
        id: findingId,
        type: 'Finding',
        name: vuln.title.trim(),
        properties: { severity: vuln.severity, summary: vuln.summary.trim(), impact: vuln.impact.trim(), proof: vuln.proof.trim() },
      },
      { id: targetId, type: 'Target', name: targetLabel },
      { id: vulnerabilityId, type: 'Vulnerability', name: vuln.vulnerabilityClass.trim() || 'Unclassified', properties: { attackVector: vuln.attackVector.trim(), rootCause: vuln.rootCause.trim() } },
      { id: componentId, type: 'Component', name: vuln.affectedComponent.trim(), properties: { errorLocation: vuln.errorLocation.trim() || undefined } },
      { id: assetId, type: 'Asset', name: vuln.affectedAsset.trim(), properties: { tags: splitMultiValueField(form.tags) } }
    )

    relations.push(
      { sourceId: findingId, targetId: programId, type: 'BELONGS_TO_PROGRAM' },
      { sourceId: findingId, targetId, type: 'TARGETS' },
      { sourceId: findingId, targetId: vulnerabilityId, type: 'HAS_VULNERABILITY_CLASS' },
      { sourceId: findingId, targetId: componentId, type: 'AFFECTS_COMPONENT' },
      { sourceId: findingId, targetId: assetId, type: 'AFFECTS_ASSET' },
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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#171717]/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mx-auto max-w-7xl" onClick={(event) => event.stopPropagation()}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_24px_80px_rgba(30,24,16,0.14)] md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe4d8] pb-6">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                  Bounty submission
                </p>
                <h2 className="mt-3 font-serif text-4xl leading-none text-[#171717] md:text-5xl">
                  {isEditing ? 'Edit your report' : 'Submit a multi-finding report'}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#5f5a51]">
                  {isEditing
                    ? 'Update your findings and save changes.'
                    : 'A single submission can contain multiple vulnerabilities. Complete the structured fields for each finding.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {isGenerating && (
                  <div className="hidden border-r border-[#ebe4d8] pr-4 md:flex md:items-center md:gap-6">
                    <div className={`flex flex-col items-center gap-1 transition-opacity ${simPhase === 'discovery' ? 'scale-110 opacity-100' : 'opacity-40'}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f5a3f] text-[10px] font-bold text-white shadow-sm">AT</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#7b7468]">Discovery</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 transition-opacity ${simPhase === 'source' ? 'scale-110 opacity-100' : 'opacity-40'}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b5cf6] text-[10px] font-bold text-white shadow-sm">MS</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#7b7468]">Provenance</span>
                    </div>
                    <div className={`flex flex-col items-center gap-1 transition-opacity ${simPhase === 'audit' ? 'scale-110 opacity-100' : 'opacity-40'}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-white shadow-sm">OD</div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#7b7468]">AI Audit</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={handleMagicScan} disabled={isGenerating}>
                    {isGenerating ? 'Agents working...' : 'Magic AI Scan First Finding'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-6 rounded-3xl border border-[#e7c7bf] bg-[#fdf1ee] p-5">
                <p className="text-sm font-semibold text-[#7c2d12]">Please fix the following:</p>
                <ul className="mt-2 space-y-1 text-xs text-[#8d4a36]">
                  {errors.map((error, i) => (
                    <li key={i}>- {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 space-y-10">
              <section className="space-y-6">
                  <label className="block space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Overall Submission Title</span>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) => updateForm('title', event.target.value)}
                        placeholder="E.g., Multiple Critical Flaws in Settlement Engine"
                        className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                      />
                  </label>
                  
                  {/* Keep program selection and agents here for the overall submission */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Bounty program</span>
                      </div>
                      {initialProgramId ? (
                        <div className="w-full rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] px-4 py-3 text-sm font-semibold text-[#171717]">
                          {selectedProgram.name}
                        </div>
                      ) : (
                        <select
                          value={form.programId}
                          onChange={(event) => {
                            const nextProgram = programs.find((program) => program.id === event.target.value)
                            setForm((current) => ({
                              ...current,
                              programId: event.target.value,
                              reporterAgent: '',
                            }))
                          }}
                          className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
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

              <section className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#171717]">Choose one of your registered hunter agents</h3>
                  </div>
                  {isLoadingOwnedAgents && (
                    <div className="rounded-full border border-[#d9d1c4] bg-white px-3 py-1 text-xs text-[#7b7468]">
                      Loading your agents...
                    </div>
                  )}
                </div>

                {ownedAgents.length > 0 ? (
                  <div className="mt-5 rounded-[24px] border border-[#d9d1c4] bg-white p-2">
                    {ownedAgents.map((agent, index) => {
                      const isSelected = form.reporterAgent === agent.name
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => updateForm('reporterAgent', agent.name)}
                          className={`flex w-full items-start gap-4 rounded-[20px] px-4 py-4 text-left transition ${isSelected ? 'bg-[#171717] text-white' : 'text-[#171717] hover:bg-[#f6f2ea]'}`}
                        >
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-[#d9d1c4] bg-white text-[#171717]'}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-lg font-semibold">{agent.name}</h4>
                            <p className={`text-sm ${isSelected ? 'text-white/75' : 'text-[#6f695f]'}`}>{agent.headline}</p>
                          </div>
                          <Badge tone={isSelected ? 'new' : 'soft'}>{isSelected ? 'Selected' : 'Available'}</Badge>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#d9d1c4] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                    {user ? 'You do not have any registered agents yet.' : 'Log in to load your registered agents.'}
                  </div>
                )}
              </section>

              
              {form.vulnerabilities.map((vuln, index) => (
                  <section key={vuln.id} className="space-y-6 rounded-[28px] border border-[#d9d1c4] bg-white p-6 shadow-sm relative">
                    <div className="flex items-center justify-between pb-4 border-b border-[#ebe4d8]">
                        <h3 className="font-serif text-2xl text-[#171717]">Finding #{index + 1}</h3>
                        {form.vulnerabilities.length > 1 && (
                            <button type="button" onClick={() => removeVulnerability(vuln.id)} className="text-sm font-semibold text-[#dc2626] hover:underline">
                                Remove finding
                            </button>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
                        <label className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Finding title</span>
                            <input
                                type="text"
                                value={vuln.title}
                                onChange={(e) => updateVulnerability(vuln.id, 'title', e.target.value)}
                                placeholder="Brief description of the finding"
                                className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Severity</span>
                            <select
                                value={vuln.severity}
                                onChange={(e) => updateVulnerability(vuln.id, 'severity', e.target.value as Severity)}
                                className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                            >
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </label>
                    </div>

                    <label className="block space-y-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Target component</span>
                        </div>
                        <select
                            value={vuln.targetId}
                            onChange={(event) => updateVulnerability(vuln.id, 'targetId', event.target.value)}
                            disabled={availableTargets.length === 0}
                            className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
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

                    <div className="space-y-6">
                        <label className="block space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Summary</p>
                        <textarea
                            rows={3}
                            value={vuln.summary}
                            onChange={(e) => updateVulnerability(vuln.id, 'summary', e.target.value)}
                            className="w-full rounded-[20px] border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                        />
                        </label>

                        <label className="block space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Impact</p>
                        <textarea
                            rows={3}
                            value={vuln.impact}
                            onChange={(e) => updateVulnerability(vuln.id, 'impact', e.target.value)}
                            className="w-full rounded-[20px] border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                        />
                        </label>

                        <label className="block space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Proof of concept</p>
                        <textarea
                            rows={4}
                            value={vuln.proof}
                            onChange={(e) => updateVulnerability(vuln.id, 'proof', e.target.value)}
                            className="w-full rounded-[20px] border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                        />
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                        <label className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Error location</span>
                            <input
                                type="text"
                                value={vuln.errorLocation}
                                onChange={(e) => updateVulnerability(vuln.id, 'errorLocation', e.target.value)}
                                placeholder="File.sol:123"
                                className="w-full rounded-2xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                            />
                        </label>
                        <label className="space-y-2">
                            <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Vulnerable snippet</span>
                            </div>
                            <textarea
                                rows={6}
                                value={vuln.codeSnippet}
                                onChange={(e) => updateVulnerability(vuln.id, 'codeSnippet', e.target.value)}
                                placeholder="// Paste the vulnerable code snippet here"
                                className="w-full rounded-[24px] border border-[#d9d1c4] bg-[#fafafa] p-5 font-mono text-[13px] leading-relaxed text-[#171717] outline-none focus:border-[#171717]"
                            />
                        </label>
                    </div>
                  </section>
              ))}

              <div className="flex justify-center pt-2 pb-6 border-b border-[#ebe4d8]">
                  <Button type="button" variant="outline" size="lg" onClick={addVulnerability}>
                      + Add another finding to this submission
                  </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="agreed"
                    checked={form.agreedRules}
                    onChange={(event) => updateForm('agreedRules', event.target.checked)}
                    className="h-4 w-4 accent-[#171717]"
                  />
                  <label htmlFor="agreed" className="cursor-pointer text-sm text-[#4b463f]">
                    I confirm these findings were discovered fairly and stay within scope.
                  </label>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="md" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={!form.reporterAgent.trim() || isGenerating}
                  >
                    {isEditing ? 'Save changes' : user ? 'Submit multiple findings' : 'Log in to submit'}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Bounty context
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[#171717]">{selectedProgram.name}</h3>
              <p className="mt-2 text-sm text-[#5f5a51]">{selectedProgram.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedProgram.categories || []).map((category) => (
                  <Badge key={category} tone="soft">
                    {formatEnum(category)}
                  </Badge>
                ))}
              </div>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Max bounty</p>
                  <p className="mt-2 text-lg font-semibold text-[#171717]">{formatUsd(selectedProgram.maxBountyUsd)}</p>
                </div>
                <div className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Payout window</p>
                  <p className="mt-2 text-[#171717]">{selectedProgram.payoutWindow}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Selected agent
              </p>
              {selectedAgent ? (
                <div className="mt-4 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-white text-sm font-semibold text-[#171717]">
                      {selectedAgent.logoMark}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#171717]">{selectedAgent.name}</h4>
                      <p className="mt-2 text-sm leading-7 text-[#4b463f]">{selectedAgent.headline}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4 text-sm leading-7 text-[#4b463f]">
                  Choose one of your registered hunter agents before you submit the report.
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
