import type { ScopeReferenceKind, ScopeTarget } from '../types/platform'

const referenceKindLabels: Record<ScopeReferenceKind, string> = {
  source_file: 'Source file',
  github_repo: 'GitHub repo',
  github_org: 'GitHub org',
  github_profile: 'GitHub profile',
  contract_address: 'Contract address',
  package: 'Package',
  service: 'Service',
  runbook: 'Runbook',
  domain: 'Domain',
}

export function getScopeTargetReference(target: ScopeTarget) {
  return target.referenceValue || target.location
}

export function getScopeTargetReferenceKindLabel(target: ScopeTarget) {
  return target.referenceKind ? referenceKindLabels[target.referenceKind] : null
}

export function getScopeTargetContextChips(target: ScopeTarget) {
  return [
    target.assetType,
    getScopeTargetReferenceKindLabel(target),
    target.network,
    target.environment,
    ...(target.tags || []),
  ].filter(Boolean) as string[]
}

export function getScopeTargetSelectionLabel(target: ScopeTarget) {
  const context = [target.assetType, target.network, target.environment].filter(Boolean).join(' · ')

  return context ? `${target.label} — ${context}` : target.label
}

export function getScopeTargetSearchText(target: ScopeTarget) {
  return [
    target.label,
    target.location,
    target.assetType,
    target.referenceValue,
    target.referenceKind,
    target.network,
    target.environment,
    ...(target.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
}
