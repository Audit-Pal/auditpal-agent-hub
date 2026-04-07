export type AccentTone = 'mint' | 'violet' | 'orange' | 'ink' | 'blue' | 'rose'

export type ProgramCategory = 'WEB' | 'SMART_CONTRACT' | 'APPS' | 'BLOCKCHAIN'
export type ProgrammingLanguage = 'SOLIDITY' | 'RUST' | 'TYPESCRIPT' | 'SWIFT' | 'GO' | 'MOVE'
export type ProjectType = 'BRIDGE' | 'WALLET' | 'LENDING' | 'INFRASTRUCTURE' | 'IDENTITY' | 'TREASURY'
export type PlatformTag = 'ETHEREUM' | 'ARBITRUM' | 'BASE' | 'MONAD' | 'SUI' | 'SOLANA' | 'OFFCHAIN'
export type ProgramKind = 'BUG_BOUNTY' | 'CROWDSOURCED_AUDIT' | 'ATTACK_SIMULATION'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ProgramTab = 'overview' | 'scope' | 'triage' | 'policy'
export type ReportSource = 'CROWD_REPORT' | 'EXPLOIT_FEED' | 'AGENT_DISAGREEMENT'
export type SubmissionStatus = 'SUBMITTED' | 'NEEDS_INFO' | 'TRIAGED' | 'DUPLICATE' | 'REJECTED' | 'RESOLVED'
export type ScopeReferenceKind =
  | 'SOURCE_FILE'
  | 'GITHUB_REPO'
  | 'GITHUB_ORG'
  | 'GITHUB_PROFILE'
  | 'CONTRACT_ADDRESS'
  | 'PACKAGE'
  | 'SERVICE'
  | 'RUNBOOK'
  | 'DOMAIN'
export type ScopeEnvironment = 'MAINNET' | 'TESTNET' | 'PRODUCTION' | 'STAGING' | 'OFFCHAIN' | 'AUDIT'

export interface DirectoryMetric {
  label: string
  value: string
  note: string
}

export interface SeverityReward {
  id?: string
  severity: Severity
  maxRewardUsd: number
  triageSla: string
  payoutWindow: string
  examples: readonly string[]
}

export interface ScopeTarget {
  id: string
  label: string
  location: string
  assetType: string
  severity: Severity
  reviewStatus: string
  note: string
  referenceKind?: ScopeReferenceKind
  referenceValue?: string
  referenceUrl?: string
  network?: string
  environment?: ScopeEnvironment
  tags?: readonly string[]
}

export interface TriageStage {
  id?: string
  order: number
  title: string
  owner: string
  automation: string
  trigger: string
  outputs: readonly string[]
  humanGate: string
}

export interface ReportSnapshot {
  id: string
  humanId: string
  title: string
  source: ReportSource
  severity: Severity
  status: SubmissionStatus
  route: string
  submittedAt: string
  decisionOwner?: string
  rewardEstimateUsd?: number
  note?: string
}

export interface EvidenceField {
  id?: string
  name: string
  description: string
}

export interface PolicySection {
  id?: string
  order: number
  title: string
  items: readonly string[]
}

export interface AgentLink {
  id?: string
  agentId: string
  purpose: string
  trigger: string
  output: string
  agent?: Partial<Agent>
}

export interface Program {
  id: string
  code: string
  name: string
  company: string
  kind: ProgramKind
  tagline: string
  description: string
  accentTone: AccentTone
  logoMark: string
  isNew: boolean
  triagedLabel: string
  maxBountyUsd: number
  paidUsd: number
  scopeReviews: number
  startedAt: string
  updatedAt: string
  reputationRequired: number
  pocRequired: boolean
  liveMessage: string
  responseSla: string
  payoutCurrency: string
  payoutWindow: string
  duplicatePolicy: string
  disclosureModel: string
  categories: readonly ProgramCategory[]
  languages: readonly ProgrammingLanguage[]
  platforms: readonly PlatformTag[]
  summaryHighlights: readonly string[]
  submissionChecklist: readonly string[]
  rewardTiers: readonly SeverityReward[]
  scopeTargets: readonly ScopeTarget[]
  triageStages: readonly TriageStage[]
  policySections: readonly PolicySection[]
  reportQueue: readonly ReportSnapshot[]
  evidenceFields: readonly EvidenceField[]
  linkedAgents: readonly AgentLink[]
}

export interface AgentMetric {
  id?: string
  label: string
  value: string
  note: string
}

export interface ToolCapability {
  id?: string
  name: string
  access?: string
  useCase: string
}

export interface AgentStage {
  id?: string
  order: number
  title: string
  description: string
  outputs: readonly string[]
  humanGate?: string
}

export interface OutputField {
  id?: string
  name: string
  type: string
  description: string
}

export interface ExecutionSnapshot {
  id?: string
  programId?: string
  title: string
  status?: string
  summary: string
  timestamp: string
}

export interface Agent {
  id: string
  name: string
  accentTone: AccentTone
  logoMark: string
  rank?: number
  score?: number
  minerName?: string
  validatorScore?: number
  headline: string
  summary: string
  supportedSurfaces: readonly ProgramCategory[]
  supportedTechnologies: readonly string[]
  capabilities: readonly string[]
  metrics: readonly AgentMetric[]
  tools: readonly ToolCapability[]
  runtimeFlow: readonly AgentStage[]
  guardrails: readonly string[]
  outputSchema: readonly OutputField[]
  recentExecutions: readonly ExecutionSnapshot[]
  linkedPrograms?: readonly any[]
  isActive: boolean
}

export interface ResearcherReport {
  id: string
  humanId: string
  programId: string
  program?: Partial<Program>
  reporterId?: string
  reporterName: string
  title: string
  severity: Severity
  target: string
  summary: string
  impact: string
  proof: string
  status: SubmissionStatus
  source: ReportSource
  route: string
  responseSla: string
  nextAction: string
  submittedAt: string
}
