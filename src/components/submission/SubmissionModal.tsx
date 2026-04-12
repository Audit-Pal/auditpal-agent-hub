import { useEffect, useState, type FormEvent } from 'react'
import type { Program, ReportSubmissionInput, Severity } from '../../types/platform'
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
  onClose: () => void
  onSubmit: (submission: ReportSubmissionInput) => void
}

interface FormState {
  programId: string
  title: string
  severity: Severity
  targetId: string
  summary: string
  impact: string
  proof: string
  reporterAgent: string
  vulnerabilityClass: string
  affectedAsset: string
  affectedComponent: string
  attackVector: string
  rootCause: string
  prerequisites: string
  referenceIds: string
  transactionHashes: string
  contractAddresses: string
  repositoryLinks: string
  filePaths: string
  tags: string
  codeSnippet: string
  errorLocation: string
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

function buildKnowledgeGraph(form: FormState, selectedProgram: Program, targetLabel: string, reporterName: string) {
  const findingId = `finding:${slugify(form.title)}`
  const programId = `program:${selectedProgram.id}`
  const targetId = `target:${slugify(targetLabel)}`
  const vulnerabilityId = `vulnerability:${slugify(form.vulnerabilityClass)}`
  const componentId = `component:${slugify(form.affectedComponent)}`
  const assetId = `asset:${slugify(form.affectedAsset)}`
  const reporterId = `reporter:${slugify(reporterName)}`
  const agentId = form.reporterAgent.trim() ? `agent:${slugify(form.reporterAgent)}` : null

  return {
    entities: [
      {
        id: findingId,
        type: 'Finding',
        name: form.title.trim(),
        properties: {
          severity: form.severity,
          summary: form.summary.trim(),
          impact: form.impact.trim(),
          proof: form.proof.trim(),
        },
      },
      {
        id: programId,
        type: 'Program',
        name: selectedProgram.name,
        properties: {
          code: selectedProgram.code,
        },
      },
      {
        id: targetId,
        type: 'Target',
        name: targetLabel,
      },
      {
        id: vulnerabilityId,
        type: 'Vulnerability',
        name: form.vulnerabilityClass.trim() || 'Unclassified',
        properties: {
          attackVector: form.attackVector.trim(),
          rootCause: form.rootCause.trim(),
        },
      },
      {
        id: componentId,
        type: 'Component',
        name: form.affectedComponent.trim(),
        properties: {
          errorLocation: form.errorLocation.trim() || undefined,
        },
      },
      {
        id: assetId,
        type: 'Asset',
        name: form.affectedAsset.trim(),
        properties: {
          tags: splitMultiValueField(form.tags),
        },
      },
      {
        id: reporterId,
        type: 'Reporter',
        name: reporterName,
      },
      ...(agentId
        ? [
            {
              id: agentId,
              type: 'Agent',
              name: form.reporterAgent.trim(),
            },
          ]
        : []),
    ],
    relations: [
      { sourceId: findingId, targetId: programId, type: 'BELONGS_TO_PROGRAM' },
      { sourceId: findingId, targetId, type: 'TARGETS' },
      { sourceId: findingId, targetId: vulnerabilityId, type: 'HAS_VULNERABILITY_CLASS' },
      { sourceId: findingId, targetId: componentId, type: 'AFFECTS_COMPONENT' },
      { sourceId: findingId, targetId: assetId, type: 'AFFECTS_ASSET' },
      { sourceId: findingId, targetId: reporterId, type: 'REPORTED_BY' },
      ...(agentId ? [{ sourceId: findingId, targetId: agentId, type: 'DETECTED_WITH_AGENT' }] : []),
    ],
  }
}

function createInitialState(programs: readonly Program[], programId?: string | null): FormState {
  const selectedProgram = programs.find((program) => program.id === programId) ?? programs[0]
  const defaultTarget = selectedProgram?.scopeTargets?.[0]

  return {
    programId: selectedProgram?.id ?? '',
    title: 'Precision loss in fee distribution during settlement',
    severity: 'HIGH',
    targetId: defaultTarget?.id ?? '',
    summary:
      'A mathematical precision error in the settlement logic allows users to bypass fee collection by splitting transactions into smaller chunks below the wei threshold.',
    impact:
      'Loss of protocol revenue and potential drain of settlement treasury over multiple small-scale transactions.',
    proof:
      '1. Deploy MockVault.sol\n2. Call distribute(1e9) with 0.1% fee\n3. Observe rounding down to zero\n4. Repeat 1000x to drain total reserves.',
    reporterAgent: '',
    vulnerabilityClass: 'Mathematical precision error',
    affectedAsset: selectedProgram?.name ?? 'Protocol Core',
    affectedComponent: defaultTarget?.label ?? 'SettlementEngine.sol',
    attackVector: 'Rounding error in fixed-point arithmetic',
    rootCause: 'Using division before multiplication in the fee calculation block.',
    prerequisites: 'Minimal liquidity threshold in the settlement pool.',
    referenceIds: 'REF-882, SEC-101',
    transactionHashes: '0xabc123...',
    contractAddresses: '0x123...abc (Testnet)',
    repositoryLinks: 'https://github.com/auditpal/core-contracts/blob/main/SettlementEngine.sol#L45-L50',
    filePaths: 'contracts/SettlementEngine.sol',
    tags: 'math, rounding, gas-optimization',
    codeSnippet:
      'function calculateFee(uint256 amount) public pure returns (uint256) {\n  return amount / 1000 * FEE_BPS; // Vulnerable: division before multiplication\n}',
    errorLocation: 'SettlementEngine.sol:45',
    agreedRules: true,
    stayedInScope: true,
  }
}

export function SubmissionModal({
  isOpen,
  programs,
  initialProgramId,
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

  const programSummary = programs.find((program) => program.id === form.programId) ?? programs[0]
  const selectedProgram = programDetail?.id === form.programId ? programDetail : programSummary
  const availableTargets = selectedProgram?.scopeTargets || []
  const selectedTarget = availableTargets.find((target) => target.id === form.targetId)
  const selectedAgent = ownedAgents.find((agent) => agent.name === form.reporterAgent)

  useEffect(() => {
    if (!isOpen) return

    setForm(createInitialState(programs, initialProgramId))
    setErrors([])
    setIsGenerating(false)
    setSimPhase('none')
    setProgramDetail(null)
  }, [initialProgramId, isOpen, programs])

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
    if (!selectedProgram) return

    const scopeIds = (selectedProgram.scopeTargets || []).map((target) => target.id)
    if (!scopeIds.includes(form.targetId)) {
      setForm((current) => ({
        ...current,
        targetId: scopeIds[0] ?? '',
        affectedAsset: selectedProgram.name,
        affectedComponent: selectedProgram.scopeTargets?.[0]?.label || '',
      }))
    }
  }, [form.targetId, selectedProgram])

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

  const handleMagicScan = async () => {
    if (!form.codeSnippet.trim() && !form.summary.trim()) {
      setErrors(['Please provide a code snippet or a brief description for the AI to analyze.'])
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
        code: form.codeSnippet,
        description: form.summary,
      })

      if (res.success && res.data) {
        const data = res.data
        setForm((current) => ({
          ...current,
          title: data.title || current.title,
          severity: data.severity || current.severity,
          summary: data.summary || current.summary,
          impact: data.impact || current.impact,
          proof: data.proof || current.proof,
          vulnerabilityClass: data.graphContext?.vulnerabilityClass || current.vulnerabilityClass,
          attackVector: data.graphContext?.attackVector || current.attackVector,
          rootCause: data.graphContext?.rootCause || current.rootCause,
        }))
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

    const nextErrors = [
      !form.reporterAgent.trim() && 'Choose one of your registered hunter agents before submitting.',
      form.title.trim().length < 5 && 'Add a report title.',
      !form.targetId.trim() && 'Choose the affected target.',
      form.summary.trim().length < 10 && 'Describe the issue.',
      form.impact.trim().length < 5 && 'Explain the impact.',
      form.proof.trim().length < 5 && 'Include proof.',
      !form.agreedRules && 'Confirm compliance.',
    ].filter(Boolean) as string[]

    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors([])

    const targetLabel = selectedTarget ? getScopeTargetSelectionLabel(selectedTarget) : form.targetId.trim()
    const knowledgeGraph = buildKnowledgeGraph(form, selectedProgram, targetLabel, user?.name || 'Anonymous')

    onSubmit({
      programId: form.programId,
      reporterName: user?.name || 'Anonymous',
      title: form.title.trim(),
      severity: form.severity,
      target: targetLabel,
      summary: form.summary.trim(),
      impact: form.impact.trim(),
      proof: form.proof.trim(),
      source: 'CROWD_REPORT',
      codeSnippet: form.codeSnippet.trim() || undefined,
      errorLocation: form.errorLocation.trim() || undefined,
      graphContext: {
        reporterAgent: form.reporterAgent.trim() || undefined,
        vulnerabilityClass: form.vulnerabilityClass.trim() || 'General finding',
        affectedAsset: form.affectedAsset.trim() || selectedProgram.name,
        affectedComponent: form.affectedComponent.trim() || targetLabel,
        attackVector: form.attackVector.trim() || 'Undefined',
        rootCause: form.rootCause.trim() || 'Undefined',
        prerequisites: form.prerequisites.trim() || undefined,
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
                  Submit a report with an agent-first flow
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#5f5a51]">
                  Choose one of your own registered hunter agents first, then complete the structured report fields. The form stays pre-filled with example data so testing is still quick.
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
                    {isGenerating ? 'Agents working...' : 'Magic AI Scan'}
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
                  {errors.map((error) => (
                    <li key={error}>- {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 space-y-8">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Bounty program</span>
                    <span className="text-[10px] text-[#9a9488]">The program you are reporting to.</span>
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
                          targetId: nextProgram?.scopeTargets?.[0]?.id ?? '',
                          reporterAgent: '',
                          affectedAsset: nextProgram?.name ?? '',
                          affectedComponent: nextProgram?.scopeTargets?.[0]?.label ?? '',
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

                <label className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Target component</span>
                    <span className="text-[10px] text-[#9a9488]">Select the specific contract, repo, or module that is affected.</span>
                  </div>
                  <select
                    value={form.targetId}
                    onChange={(event) => {
                      const nextTarget = availableTargets.find((target) => target.id === event.target.value)
                      updateForm('targetId', event.target.value)
                      if (nextTarget) {
                        updateForm('affectedComponent', nextTarget.label)
                        if (!form.codeSnippet && nextTarget.sourceCode) {
                          updateForm('codeSnippet', nextTarget.sourceCode)
                        }
                      }
                    }}
                    disabled={availableTargets.length === 0}
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  >
                    {availableTargets.length === 0 ? (
                      <option value="">No scoped targets available for this program</option>
                    ) : (
                      availableTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {getScopeTargetSelectionLabel(target)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>

              <section className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Step 1</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[#171717]">Choose one of your registered hunter agents</h3>
                  </div>
                  {isLoadingOwnedAgents && (
                    <div className="rounded-full border border-[#d9d1c4] bg-white px-3 py-1 text-xs text-[#7b7468]">
                      Loading your agents...
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-[24px] border border-[#d9d1c4] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                  Report submission requires one of your own registered agents. The bounty-linked agents shown on the bounty page are context for the campaign, not the agent selector used here.
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
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-[#d9d1c4] bg-white text-[#171717]'}`}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${isSelected ? 'border-white/20 bg-white/10 text-white' : 'border-[#d9d1c4] bg-[#f6f2ea] text-[#171717]'}`}
                              >
                                {agent.logoMark}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold">{agent.name}</h4>
                                <p className={`text-sm ${isSelected ? 'text-white/75' : 'text-[#6f695f]'}`}>{agent.headline}</p>
                              </div>
                            </div>
                            {agent.capabilities && agent.capabilities.length > 0 && (
                              <ul className={`mt-3 list-disc space-y-1 pl-5 text-sm ${isSelected ? 'text-white/80' : 'text-[#4b463f]'}`}>
                                {agent.capabilities.slice(0, 3).map((capability) => (
                                  <li key={capability}>{capability}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <Badge tone={isSelected ? 'new' : 'soft'}>{isSelected ? 'Selected' : 'Available'}</Badge>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#d9d1c4] bg-white p-4 text-sm leading-7 text-[#4b463f]">
                    {user
                      ? 'You do not have any registered agents yet. Create one from the profile menu before submitting this report.'
                      : 'Log in to load your registered agents before submitting.'}
                  </div>
                )}
              </section>

              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Report title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => updateForm('title', event.target.value)}
                    placeholder="Brief description of the finding"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Severity</span>
                  <select
                    value={form.severity}
                    onChange={(event) => updateForm('severity', event.target.value as Severity)}
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>

              <div className="space-y-6 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-6 text-[#171717]">
                <label className="block space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Summary</p>
                  <textarea
                    rows={3}
                    value={form.summary}
                    onChange={(event) => updateForm('summary', event.target.value)}
                    className="w-full rounded-[20px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="block space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Impact</p>
                  <textarea
                    rows={3}
                    value={form.impact}
                    onChange={(event) => updateForm('impact', event.target.value)}
                    className="w-full rounded-[20px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="block space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Proof of concept</p>
                  <textarea
                    rows={4}
                    value={form.proof}
                    onChange={(event) => updateForm('proof', event.target.value)}
                    className="w-full rounded-[20px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#171717]"
                  />
                </label>
              </div>

              <div className="space-y-6 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-6 shadow-[inset_0_2px_12px_rgba(23,23,23,0.03)]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Vulnerable code and URLs</p>
                  <Badge tone="success">Priority section</Badge>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Github / repository link</span>
                    <input
                      type="text"
                      value={form.repositoryLinks}
                      onChange={(event) => updateForm('repositoryLinks', event.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Contract / testnet URL</span>
                    <input
                      type="text"
                      value={form.contractAddresses}
                      onChange={(event) => updateForm('contractAddresses', event.target.value)}
                      placeholder="0x... or scanner link"
                      className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Error location</span>
                    <input
                      type="text"
                      value={form.errorLocation}
                      onChange={(event) => updateForm('errorLocation', event.target.value)}
                      placeholder="File.sol:123"
                      className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                    />
                  </label>

                  <label className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Vulnerable snippet</span>
                      {selectedTarget?.sourceCode && (
                        <button
                          type="button"
                          onClick={() => updateForm('codeSnippet', selectedTarget.sourceCode!)}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#315e50] hover:underline"
                        >
                          Reset to target code
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={10}
                      value={form.codeSnippet}
                      onChange={(event) => updateForm('codeSnippet', event.target.value)}
                      placeholder="// Paste the vulnerable code snippet here"
                      className="w-full rounded-[24px] border border-[#d9d1c4] bg-[#fafafa] p-5 font-mono text-[13px] leading-relaxed text-[#171717] outline-none transition focus:border-[#171717] focus:bg-white focus:shadow-[0_8px_32px_rgba(23,23,23,0.06)]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe4d8] pt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="agreed"
                    checked={form.agreedRules}
                    onChange={(event) => updateForm('agreedRules', event.target.checked)}
                    className="h-4 w-4 accent-[#171717]"
                  />
                  <label htmlFor="agreed" className="cursor-pointer text-sm text-[#4b463f]">
                    I confirm this report was discovered fairly and stays within scope.
                  </label>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="md" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md">
                    {user ? 'Submit report' : 'Log in to submit'}
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

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Submission status
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#315e50]" />
                  <p className="text-sm text-[#4b463f]">Triage SLA: {selectedProgram.responseSla}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#315e50]" />
                  <p className="text-sm text-[#4b463f]">Registered agents: {ownedAgents.length}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#315e50]" />
                  <p className="text-sm text-[#4b463f]">Program detail: {isLoadingProgramDetail ? 'Loading' : 'Ready'}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
