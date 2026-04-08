import { useEffect, useState, type FormEvent } from 'react'
import type { Program, ReportSubmissionInput, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { getScopeTargetContextChips, getScopeTargetReference, getScopeTargetSelectionLabel } from '../../utils/scopeTargets'
import { formatEnum } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'

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

const defaultSeverity: Severity = 'MEDIUM'

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
        name: form.vulnerabilityClass.trim(),
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
    title: '',
    severity: defaultSeverity,
    targetId: defaultTarget?.id ?? '',
    summary: '',
    impact: '',
    proof: '',
    reporterAgent: '',
    vulnerabilityClass: '',
    affectedAsset: selectedProgram?.name ?? '',
    affectedComponent: defaultTarget?.label ?? '',
    attackVector: '',
    rootCause: '',
    prerequisites: '',
    referenceIds: '',
    transactionHashes: '',
    contractAddresses: '',
    repositoryLinks: '',
    filePaths: '',
    tags: '',
    codeSnippet: '',
    errorLocation: '',
    agreedRules: false,
    stayedInScope: false,
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
  const selectedProgram = programs.find((program) => program.id === form.programId) ?? programs[0]

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(createInitialState(programs, initialProgramId))
    setErrors([])
  }, [initialProgramId, isOpen, programs])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedProgram) {
      return
    }

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

  if (!isOpen || !selectedProgram) {
    return null
  }

  const selectedTarget = (selectedProgram.scopeTargets || []).find((target) => target.id === form.targetId)

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = [
      !user && 'You must be logged in to submit a report.',
      form.title.trim().length < 5 && 'Add a report title (min 5 characters).',
      !form.targetId.trim() && 'Choose the affected in-scope target.',
      form.summary.trim().length < 20 && 'Describe the issue clearly (min 20 characters).',
      form.impact.trim().length < 10 && 'Explain the security impact (min 10 characters).',
      form.proof.trim().length < 10 && 'Include proof or replay notes (min 10 characters).',
      form.vulnerabilityClass.trim().length < 3 && 'Label the vulnerability class for the future knowledge graph.',
      form.affectedAsset.trim().length < 3 && 'Describe the affected asset or system.',
      form.affectedComponent.trim().length < 3 && 'Describe the affected component or module.',
      form.attackVector.trim().length < 10 && 'Explain the attack vector or exploit path (min 10 characters).',
      form.rootCause.trim().length < 15 && 'Describe the root cause in enough detail (min 15 characters).',
      !!form.codeSnippet.trim() && form.errorLocation.trim().length < 3 && 'Add the error location when you attach a code snippet.',
      !form.agreedRules && 'Confirm that you reviewed the bounty rules.',
      !form.stayedInScope && 'Confirm that testing stayed inside the published scope.',
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
        vulnerabilityClass: form.vulnerabilityClass.trim(),
        affectedAsset: form.affectedAsset.trim(),
        affectedComponent: form.affectedComponent.trim(),
        attackVector: form.attackVector.trim(),
        rootCause: form.rootCause.trim(),
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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_24px_80px_rgba(30,24,16,0.14)] md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe4d8] pb-6">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                  Submission API
                </p>
                <h2 className="mt-3 font-serif text-4xl leading-none text-[#171717] md:text-5xl">
                  Submit a KG-ready finding
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#5f5a51]">
                  This form captures the narrative, affected systems, code context, and graph seed metadata we need for low-effort filtering, AI triage, and later knowledge-base work.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>

            {errors.length > 0 && (
              <div className="mt-6 rounded-3xl border border-[#e7c7bf] bg-[#fdf1ee] p-5">
                <p className="text-sm font-semibold text-[#7c2d12]">Please fix the following before submitting:</p>
                <ul className="mt-3 space-y-2 text-sm text-[#8d4a36]">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Bounty</span>
                <select
                  value={form.programId}
                  onChange={(event) => {
                    const nextProgram = programs.find((program) => program.id === event.target.value)
                    setForm((current) => ({
                      ...current,
                      programId: event.target.value,
                      targetId: nextProgram?.scopeTargets?.[0]?.id ?? '',
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
              </label>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Researcher</span>
                <div className="w-full rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] px-4 py-3 text-sm text-[#7b7468]">
                  {user?.name || 'Log in required'}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="Example: stale signer approvals survive policy change"
                  className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
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

            <label className="mt-5 block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Target</span>
              <select
                value={form.targetId}
                onChange={(event) => {
                  const nextTarget = (selectedProgram.scopeTargets || []).find((target) => target.id === event.target.value)
                  updateForm('targetId', event.target.value)
                  if (nextTarget) {
                    updateForm('affectedComponent', nextTarget.label)
                    if (!form.affectedAsset.trim()) updateForm('affectedAsset', selectedProgram.name)
                  }
                }}
                className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              >
                {(selectedProgram.scopeTargets || []).map((target) => (
                  <option key={target.id} value={target.id}>
                    {getScopeTargetSelectionLabel(target)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-8 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Narrative</p>
              <div className="mt-4 grid gap-5">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Summary</span>
                  <textarea
                    rows={4}
                    value={form.summary}
                    onChange={(event) => updateForm('summary', event.target.value)}
                    placeholder="What is wrong, how it happens, and which trust boundary fails?"
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Impact</span>
                  <textarea
                    rows={4}
                    value={form.impact}
                    onChange={(event) => updateForm('impact', event.target.value)}
                    placeholder="Explain the realistic outcome: theft, bypass, insolvency, consent failure, data exposure, and so on."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Proof or replay notes</span>
                  <textarea
                    rows={5}
                    value={form.proof}
                    onChange={(event) => updateForm('proof', event.target.value)}
                    placeholder="Describe the replay steps, PoC, traces, block heights, environments, or screenshots you would attach."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Graph seed metadata</p>
              <p className="mt-2 text-sm leading-7 text-[#5f5a51]">
                These fields become the structured seed for the future knowledge graph while still being readable for triage today.
              </p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Agent used by reporter</span>
                  <input
                    type="text"
                    value={form.reporterAgent}
                    onChange={(event) => updateForm('reporterAgent', event.target.value)}
                    placeholder="Example: Atlas scout agent"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Vulnerability class</span>
                  <input
                    type="text"
                    value={form.vulnerabilityClass}
                    onChange={(event) => updateForm('vulnerabilityClass', event.target.value)}
                    placeholder="Example: reentrancy"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Affected asset</span>
                  <input
                    type="text"
                    value={form.affectedAsset}
                    onChange={(event) => updateForm('affectedAsset', event.target.value)}
                    placeholder="Example: Bridge settlement liquidity"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Affected component</span>
                  <input
                    type="text"
                    value={form.affectedComponent}
                    onChange={(event) => updateForm('affectedComponent', event.target.value)}
                    placeholder="Example: BridgeRouter.sol settlement path"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-5">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Attack vector</span>
                  <textarea
                    rows={3}
                    value={form.attackVector}
                    onChange={(event) => updateForm('attackVector', event.target.value)}
                    placeholder="Describe the exploit path, trust boundary crossed, and attacker capabilities required."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Root cause</span>
                  <textarea
                    rows={3}
                    value={form.rootCause}
                    onChange={(event) => updateForm('rootCause', event.target.value)}
                    placeholder="What implementation or design mistake creates the issue?"
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Prerequisites</span>
                  <textarea
                    rows={2}
                    value={form.prerequisites}
                    onChange={(event) => updateForm('prerequisites', event.target.value)}
                    placeholder="Optional: special permissions, state assumptions, timing conditions, or setup required."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">References and identifiers</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Reference IDs</span>
                  <textarea
                    rows={3}
                    value={form.referenceIds}
                    onChange={(event) => updateForm('referenceIds', event.target.value)}
                    placeholder="Ticket IDs, internal references, or replay bundle IDs. Use commas or new lines."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Tags</span>
                  <textarea
                    rows={3}
                    value={form.tags}
                    onChange={(event) => updateForm('tags', event.target.value)}
                    placeholder="Example: bridge, accounting, replayable"
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Transaction hashes</span>
                  <textarea
                    rows={3}
                    value={form.transactionHashes}
                    onChange={(event) => updateForm('transactionHashes', event.target.value)}
                    placeholder="On-chain tx hashes, traces, or calldata references."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Contract addresses</span>
                  <textarea
                    rows={3}
                    value={form.contractAddresses}
                    onChange={(event) => updateForm('contractAddresses', event.target.value)}
                    placeholder="List affected addresses or deployments."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Repository links</span>
                  <textarea
                    rows={3}
                    value={form.repositoryLinks}
                    onChange={(event) => updateForm('repositoryLinks', event.target.value)}
                    placeholder="GitHub URLs, commit links, or branches."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">File paths</span>
                  <textarea
                    rows={3}
                    value={form.filePaths}
                    onChange={(event) => updateForm('filePaths', event.target.value)}
                    placeholder="contracts/core/BridgeRouter.sol, services/auth/session.ts, ..."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Code context</p>
              <div className="mt-4 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Error location</span>
                  <input
                    type="text"
                    value={form.errorLocation}
                    onChange={(event) => updateForm('errorLocation', event.target.value)}
                    placeholder="BridgeRouter.sol:45-50"
                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Code snippet</span>
                  <textarea
                    rows={8}
                    value={form.codeSnippet}
                    onChange={(event) => updateForm('codeSnippet', event.target.value)}
                    placeholder="Paste the vulnerable function, code excerpt, or trace snippet that best shows the issue."
                    className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 font-mono text-sm leading-6 text-[#171717] outline-none transition focus:border-[#171717]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <label className="flex items-start gap-3 rounded-2xl border border-[#e6dfd3] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                <input
                  type="checkbox"
                  checked={form.agreedRules}
                  onChange={(event) => updateForm('agreedRules', event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#171717]"
                />
                <span>I reviewed the bounty rules, duplicate policy, and disclosure model.</span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-[#e6dfd3] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                <input
                  type="checkbox"
                  checked={form.stayedInScope}
                  onChange={(event) => updateForm('stayedInScope', event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#171717]"
                />
                <span>I stayed within the listed assets and used the minimum proof needed for validation.</span>
              </label>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe4d8] pt-6">
              <p className="text-sm text-[#6f695f]">
                Expected first triage touch: <span className="font-semibold text-[#171717]">{selectedProgram.responseSla}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" size="md" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={!user}>
                  Submit report
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Selected bounty
              </p>
              <h3 className="mt-3 font-serif text-3xl text-[#171717]">{selectedProgram.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#5f5a51]">{selectedProgram.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedProgram.categories || []).map((category) => (
                  <Badge key={category} tone="soft">
                    {formatEnum(category)}
                  </Badge>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Response promise</p>
                <p className="mt-2 text-xl font-semibold text-[#171717]">{selectedProgram.responseSla}</p>
                <p className="mt-1 text-sm text-[#6f695f]">Payout window: {selectedProgram.payoutWindow}</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Submission output
              </p>
              <div className="mt-4 space-y-3">
                {[
                  'Low-effort filter reviews whether the report has enough detail to continue.',
                  'AI triage scores the submission and forwards solid reports to the organization validator queue.',
                  'Accepted reports keep the graph seed, code context, and validation notes in the database.',
                ].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                    <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Submission checklist
              </p>
              <div className="mt-4 space-y-3">
                {(selectedProgram.submissionChecklist || []).map((item, index) => (
                  <div key={item} className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Priority targets
              </p>
              <div className="mt-4 space-y-3">
                {(selectedProgram.scopeTargets || []).slice(0, 3).map((target) => (
                  <div key={target.id} className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                    <p className="font-medium text-[#171717]">{target.label}</p>
                    <p className="mt-1 text-sm text-[#6f695f]">{getScopeTargetReference(target)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getScopeTargetContextChips(target).slice(0, 3).map((chip) => (
                        <Badge key={`${target.id}-${chip}`} tone="soft">
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
