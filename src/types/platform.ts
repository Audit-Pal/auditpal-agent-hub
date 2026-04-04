export type AccentTone = 'mint' | 'violet' | 'orange' | 'ink' | 'blue' | 'rose'

export type ProgramCategory = 'Web' | 'Smart Contract' | 'Apps' | 'Blockchain'
export type ProgrammingLanguage = 'Solidity' | 'Rust' | 'TypeScript' | 'Swift' | 'Go' | 'Move'
export type ProjectType = 'Bridge' | 'Wallet' | 'Lending' | 'Infrastructure' | 'Identity' | 'Treasury'
export type PlatformTag = 'Ethereum' | 'Arbitrum' | 'Base' | 'Monad' | 'Sui' | 'Solana' | 'Offchain'
export type ProgramKind = 'Bug bounty' | 'Crowdsourced audit' | 'Attack simulation'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type ProgramTab = 'overview' | 'scope' | 'triage' | 'policy'
export type ReportSource = 'Crowd report' | 'Exploit feed' | 'Agent disagreement'
export type SubmissionStatus = 'Submitted' | 'Needs info' | 'Triaged' | 'Resolved'
export type ScopeReferenceKind =
  | 'source_file'
  | 'github_repo'
  | 'github_org'
  | 'github_profile'
  | 'contract_address'
  | 'package'
  | 'service'
  | 'runbook'
  | 'domain'
export type ScopeEnvironment = 'Mainnet' | 'Testnet' | 'Production' | 'Staging' | 'Offchain' | 'Audit'

export interface DirectoryMetric {
  label: string
  value: string
  note: string
}

export interface SeverityReward {
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
  title: string
  owner: string
  automation: string
  trigger: string
  outputs: readonly string[]
  humanGate: string
}

export interface ReportSnapshot {
  id: string
  title: string
  source: ReportSource
  severity: Severity
  status: string
  route: string
  submittedAt: string
  decisionOwner: string
  rewardEstimateUsd: number
  note: string
}

export interface EvidenceField {
  name: string
  description: string
}

export interface PolicySection {
  title: string
  items: readonly string[]
}

export interface AgentLink {
  agentId: string
  purpose: string
  trigger: string
  output: string
}

export interface ProgramHeaderDetails {
  reputationRequired: number
  pocRequired: boolean
  liveMessage: string
  responseSla: string
  payoutCurrency: string
  payoutWindow: string
  duplicatePolicy: string
  disclosureModel: string
}

export interface Program {
  id: string
  code: string
  name: string
  company: string
  kind: ProgramKind
  tagline: string
  description: string
  accent: AccentTone
  logoMark: string
  isNew: boolean
  triagedLabel: string
  maxBountyUsd: number
  paidUsd: number
  scopeReviews: number
  startedAt: string
  updatedAt: string
  categories: readonly ProgramCategory[]
  languages: readonly ProgrammingLanguage[]
  projectTypes: readonly ProjectType[]
  platforms: readonly PlatformTag[]
  header: ProgramHeaderDetails
  summaryHighlights: readonly string[]
  rewardMatrix: readonly SeverityReward[]
  scopeTargets: readonly ScopeTarget[]
  triageFlow: readonly TriageStage[]
  reportQueue: readonly ReportSnapshot[]
  evidenceBundle: readonly EvidenceField[]
  policySections: readonly PolicySection[]
  linkedAgents: readonly AgentLink[]
  submissionChecklist: readonly string[]
}

export interface AgentMetric {
  label: string
  value: string
  note: string
}

export interface ToolCapability {
  name: string
  access?: string
  useCase: string
}

export interface AgentStage {
  title: string
  description: string
  outputs: readonly string[]
  humanGate?: string
}

export interface OutputField {
  name: string
  type: string
  description: string
}

export interface ExecutionSnapshot {
  programId?: string
  title: string
  status?: string
  summary: string
  timestamp: string
}

export interface Agent {
  id: string
  name: string
  accent: AccentTone
  logoMark: string
  rank?: number
  score?: number
  minerName?: string
  validatorScore?: number
  headline: string
  summary: string
  supportedSurfaces?: readonly ProgramCategory[]
  supportedTechnologies?: readonly string[]
  capabilities?: readonly string[]
  metrics: readonly AgentMetric[]
  tools?: readonly ToolCapability[]
  runtimeFlow?: readonly AgentStage[]
  guardrails?: readonly string[]
  outputSchema?: readonly OutputField[]
  recentExecutions?: readonly ExecutionSnapshot[]
  linkedPrograms?: readonly string[]
}

export interface PlatformMock {
  directoryMetrics: readonly DirectoryMetric[]
  hiddenGemIds: readonly string[]
  programs: readonly Program[]
  agents: readonly Agent[]
}

export interface ResearcherReport {
  id: string
  programId: string
  programName: string
  programCode: string
  title: string
  severity: Severity
  target: string
  summary: string
  impact: string
  proof: string
  reporter: string
  submittedAt: string
  status: SubmissionStatus
  route: string
  responseSla: string
  nextAction: string
}
