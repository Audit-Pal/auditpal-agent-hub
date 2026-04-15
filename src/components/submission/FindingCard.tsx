import React, { useState, useEffect } from 'react'
import type { Severity, ScopeTarget } from '../../types/platform'
import { getScopeTargetSelectionLabel } from '../../utils/scopeTargets'

export interface FormVulnerability {
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

interface FindingCardProps {
  vuln: FormVulnerability
  index: number
  availableTargets: readonly ScopeTarget[]
  onUpdate: (id: string, key: keyof FormVulnerability, value: any) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

const FindingCardBase: React.FC<FindingCardProps> = ({
  vuln,
  index,
  availableTargets,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  // Local state for high-frequency text fields to prevent lagginess
  const [localSummary, setLocalSummary] = useState(vuln.summary)
  const [localImpact, setLocalImpact] = useState(vuln.impact)
  const [localProof, setLocalProof] = useState(vuln.proof)
  const [localSnippet, setLocalSnippet] = useState(vuln.codeSnippet)

  // Sync back to parent when local state changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSummary !== vuln.summary) onUpdate(vuln.id, 'summary', localSummary)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSummary, vuln.id, vuln.summary, onUpdate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localImpact !== vuln.impact) onUpdate(vuln.id, 'impact', localImpact)
    }, 500)
    return () => clearTimeout(timer)
  }, [localImpact, vuln.id, vuln.impact, onUpdate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localProof !== vuln.proof) onUpdate(vuln.id, 'proof', localProof)
    }, 500)
    return () => clearTimeout(timer)
  }, [localProof, vuln.id, vuln.proof, onUpdate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSnippet !== vuln.codeSnippet) onUpdate(vuln.id, 'codeSnippet', localSnippet)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSnippet, vuln.id, vuln.codeSnippet, onUpdate])

  // If parent state changes (e.g. from AI scan), update local state
  useEffect(() => {
    setLocalSummary(vuln.summary)
  }, [vuln.summary])

  useEffect(() => {
    setLocalImpact(vuln.impact)
  }, [vuln.impact])

  useEffect(() => {
    setLocalProof(vuln.proof)
  }, [vuln.proof])

  useEffect(() => {
    setLocalSnippet(vuln.codeSnippet)
  }, [vuln.codeSnippet])

  return (
    <section className="surface-card rounded-[32px] border border-[rgba(80,120,130,0.18)] p-6 md:p-8 animate-fade-up relative">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)] text-[11px] font-bold text-[var(--accent)]">
            {String(index + 1).padStart(2, '0')}
          </div>
          <h4 className="text-xl font-bold text-[var(--text)]">Finding details</h4>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(vuln.id)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--critical-text)] transition-colors hover:bg-[var(--critical-soft)] rounded-xl"
            title="Remove this finding"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] mt-8">
        <label className="space-y-2">
          <span className="field-label">Finding title</span>
          <input
            type="text"
            value={vuln.title}
            onChange={(e) => onUpdate(vuln.id, 'title', e.target.value)}
            placeholder="Brief description of the finding"
            className="field"
          />
        </label>

        <label className="space-y-2">
          <span className="field-label">Severity</span>
          <select
            value={vuln.severity}
            onChange={(e) => onUpdate(vuln.id, 'severity', e.target.value as Severity)}
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
          onChange={(event) => onUpdate(vuln.id, 'targetId', event.target.value)}
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
            value={localSummary}
            onChange={(e) => setLocalSummary(e.target.value)}
            onBlur={() => onUpdate(vuln.id, 'summary', localSummary)}
            className="field-area"
          />
        </label>

        <label className="block space-y-2">
          <p className="field-label">Impact</p>
          <textarea
            rows={3}
            value={localImpact}
            onChange={(e) => setLocalImpact(e.target.value)}
            onBlur={() => onUpdate(vuln.id, 'impact', localImpact)}
            className="field-area"
          />
        </label>

        <label className="block space-y-2">
          <p className="field-label">Proof of concept</p>
          <textarea
            rows={4}
            value={localProof}
            onChange={(e) => setLocalProof(e.target.value)}
            onBlur={() => onUpdate(vuln.id, 'proof', localProof)}
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
            onChange={(e) => onUpdate(vuln.id, 'errorLocation', e.target.value)}
            placeholder="File.sol:123"
            className="field"
          />
        </label>
        <label className="space-y-2">
          <span className="field-label">Vulnerable snippet</span>
          <textarea
            rows={6}
            value={localSnippet}
            onChange={(e) => setLocalSnippet(e.target.value)}
            onBlur={() => onUpdate(vuln.id, 'codeSnippet', localSnippet)}
            placeholder="// Paste the vulnerable code snippet here"
            className="field-area bg-[rgba(3,8,12,0.4)] font-mono text-[13px] border-[rgba(80,120,130,0.3)] placeholder:opacity-30"
          />
        </label>
      </div>
    </section>
  )
}

export const FindingCard = React.memo(FindingCardBase)
