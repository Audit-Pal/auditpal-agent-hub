import { useEffect, useState, type FormEvent } from 'react'
import type { Program, ResearcherReport, Severity } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { getScopeTargetContextChips, getScopeTargetReference, getScopeTargetSelectionLabel } from '../../utils/scopeTargets'

type SubmissionPayload = Omit<
  ResearcherReport,
  'id' | 'programName' | 'programCode' | 'submittedAt' | 'status' | 'route' | 'responseSla' | 'nextAction'
>

interface SubmissionModalProps {
  isOpen: boolean
  programs: readonly Program[]
  initialProgramId?: string | null
  onClose: () => void
  onSubmit: (submission: SubmissionPayload) => void
}

interface FormState {
  programId: string
  reporter: string
  title: string
  severity: Severity
  targetId: string
  summary: string
  impact: string
  proof: string
  agreedRules: boolean
  stayedInScope: boolean
}

const defaultSeverity: Severity = 'Medium'

function createInitialState(programs: readonly Program[], programId?: string | null): FormState {
  const selectedProgram = programs.find((program) => program.id === programId) ?? programs[0]

  return {
    programId: selectedProgram?.id ?? '',
    reporter: '',
    title: '',
    severity: defaultSeverity,
    targetId: selectedProgram?.scopeTargets[0]?.id ?? '',
    summary: '',
    impact: '',
    proof: '',
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

    const scopeIds = selectedProgram.scopeTargets.map((target) => target.id)

    if (!scopeIds.includes(form.targetId)) {
      setForm((current) => ({
        ...current,
        targetId: scopeIds[0] ?? '',
      }))
    }
  }, [form.targetId, selectedProgram])

  if (!isOpen || !selectedProgram) {
    return null
  }

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = [
      !form.reporter.trim() && 'Add your researcher handle or name.',
      !form.title.trim() && 'Add a concise report title.',
      !form.targetId.trim() && 'Choose the affected in-scope target.',
      !form.summary.trim() && 'Describe the issue clearly.',
      !form.impact.trim() && 'Explain the security impact.',
      !form.proof.trim() && 'Include proof or replay notes.',
      !form.agreedRules && 'Confirm that you reviewed the program rules.',
      !form.stayedInScope && 'Confirm that testing stayed inside the published scope.',
    ].filter(Boolean) as string[]

    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors([])

    const selectedTarget = selectedProgram.scopeTargets.find((target) => target.id === form.targetId)

    onSubmit({
      programId: form.programId,
      reporter: form.reporter.trim(),
      title: form.title.trim(),
      severity: form.severity,
      target: selectedTarget ? getScopeTargetSelectionLabel(selectedTarget) : form.targetId.trim(),
      summary: form.summary.trim(),
      impact: form.impact.trim(),
      proof: form.proof.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#171717]/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mx-auto max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_340px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_24px_80px_rgba(30,24,16,0.14)] md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ebe4d8] pb-6">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                  Submit report
                </p>
                <h2 className="mt-3 font-serif text-4xl leading-none text-[#171717] md:text-5xl">
                  Start a new finding
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#5f5a51]">
                  This is a working front-end submission flow. Reports are stored locally so you can test the end-to-end experience and see them appear in the report center immediately.
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
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Program</span>
                <select
                  value={form.programId}
                  onChange={(event) => updateForm('programId', event.target.value)}
                  className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Researcher</span>
                <input
                  type="text"
                  value={form.reporter}
                  onChange={(event) => updateForm('reporter', event.target.value)}
                  placeholder="name, handle, or team"
                  className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                />
              </label>
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
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Target</span>
              <select
                value={form.targetId}
                onChange={(event) => updateForm('targetId', event.target.value)}
                className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
              >
                {selectedProgram.scopeTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {getScopeTargetSelectionLabel(target)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 grid gap-5">
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

            <div className="mt-6 grid gap-3">
              <label className="flex items-start gap-3 rounded-2xl border border-[#e6dfd3] bg-[#fbf8f2] p-4 text-sm text-[#4b463f]">
                <input
                  type="checkbox"
                  checked={form.agreedRules}
                  onChange={(event) => updateForm('agreedRules', event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#171717]"
                />
                <span>I reviewed the program rules, duplicate policy, and disclosure model.</span>
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
                Expected first triage touch: <span className="font-semibold text-[#171717]">{selectedProgram.header.responseSla}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" size="md" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Submit report
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Selected program
              </p>
              <h3 className="mt-3 font-serif text-3xl text-[#171717]">{selectedProgram.name}</h3>
              <p className="mt-2 text-sm leading-7 text-[#5f5a51]">{selectedProgram.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedProgram.categories.map((category) => (
                  <Badge key={category} tone="soft">
                    {category}
                  </Badge>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Response promise</p>
                <p className="mt-2 text-xl font-semibold text-[#171717]">{selectedProgram.header.responseSla}</p>
                <p className="mt-1 text-sm text-[#6f695f]">Payout window: {selectedProgram.header.payoutWindow}</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                Submission checklist
              </p>
              <div className="mt-4 space-y-3">
                {selectedProgram.submissionChecklist.map((item, index) => (
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
                {selectedProgram.scopeTargets.slice(0, 3).map((target) => (
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
