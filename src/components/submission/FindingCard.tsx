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

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#ff6b6b', bg: 'rgba(255,80,80,0.1)', label: 'Critical' },
  HIGH: { color: '#ffb347', bg: 'rgba(255,165,60,0.1)', label: 'High' },
  MEDIUM: { color: '#ffd487', bg: 'rgba(255,211,125,0.1)', label: 'Medium' },
  LOW: { color: '#7eefc0', bg: 'rgba(60,210,140,0.1)', label: 'Low' },
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

  const severityConfig = SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.MEDIUM

  return (
    <section className="finding-card">
      <div className="finding-card__header">
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
            style={{ background: severityConfig.bg, color: severityConfig.color, border: `1px solid ${severityConfig.color}25` }}
          >
            {index + 1}
          </div>
          <span className="text-sm font-bold text-[var(--text)]">Finding #{index + 1}</span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: severityConfig.bg, color: severityConfig.color }}
          >
            {severityConfig.label}
          </span>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(vuln.id)}
            className="text-[var(--text-muted)] hover:text-[var(--critical-text)] transition-colors p-1"
            title="Remove finding"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="finding-card__body space-y-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="space-y-2">
            <span className="field-label">Finding title *</span>
            <input
              type="text"
              value={vuln.title}
              onChange={(e) => onUpdate(vuln.id, 'title', e.target.value)}
              placeholder="e.g., Re-entrancy in withdraw function"
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

          <label className="block space-y-2 mt-5">
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

          <div className="space-y-6">
            <label className="block space-y-2">
              <p className="field-label">Summary *</p>
              <textarea
                rows={3}
                value={localSummary}
                onChange={(e) => setLocalSummary(e.target.value)}
                onBlur={() => onUpdate(vuln.id, 'summary', localSummary)}
                placeholder="How does this vulnerability work?"
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
                placeholder="What's the real-world impact of this vulnerability?"
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
                placeholder="Step-by-step instructions to reproduce the issue..."
                className="field-area"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="field-label">Location</span>
              <input
                type="text"
                value={vuln.errorLocation}
                onChange={(e) => onUpdate(vuln.id, 'errorLocation', e.target.value)}
                placeholder="File.sol:123"
                className="field"
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Vulnerable Code</span>
              <textarea
                rows={4}
                value={localSnippet}
                onChange={(e) => setLocalSnippet(e.target.value)}
                onBlur={() => onUpdate(vuln.id, 'codeSnippet', localSnippet)}
                placeholder="// Paste the code here"
                className="field-area bg-[rgba(3,8,12,0.4)] font-mono text-xs border-[rgba(80,120,130,0.25)] placeholder:opacity-30"
              />
            </label>
          </div>
      </div>
    </section>
  )
}

export const FindingCard = React.memo(FindingCardBase)
