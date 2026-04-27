export type AccentTone = 'mint' | 'violet' | 'orange' | 'ink' | 'blue' | 'rose'

export type ProgramCategory = 'WEB' | 'SMART_CONTRACT' | 'APPS' | 'BLOCKCHAIN'
export type ProgrammingLanguage = 'SOLIDITY' | 'RUST' | 'TYPESCRIPT' | 'SWIFT' | 'GO' | 'MOVE'
export type ProjectType = 'BRIDGE' | 'WALLET' | 'LENDING' | 'INFRASTRUCTURE' | 'IDENTITY' | 'TREASURY'
export type PlatformTag = 'ETHEREUM' | 'ARBITRUM' | 'BASE' | 'MONAD' | 'SUI' | 'SOLANA' | 'OFFCHAIN'
export type ProgramKind = 'BUG_BOUNTY' | 'CROWDSOURCED_AUDIT' | 'ATTACK_SIMULATION'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ProgramTab = 'overview' | 'scope' | 'submission' | 'triage' | 'policy'
export type ReportSource = 'CROWD_REPORT' | 'EXPLOIT_FEED' | 'AGENT_DISAGREEMENT'
export type ValidationAction = 'ACCEPT' | 'REJECT' | 'ESCALATE'
export type SubmissionStatus =
  | 'SUBMITTED'
  | 'NEEDS_INFO'
  | 'TRIAGED'
  | 'DUPLICATE'
  | 'REJECTED'
  | 'RESOLVED'
  | 'LOW_EFFORT'
  | 'AI_TRIAGE_PENDING'
  | 'AI_TRIAGED'
  | 'ESCALATED'
  | 'ACCEPTED'

export type ProgramStatus = 'DRAFT' | 'AWAITING_FUNDS' | 'ACTIVE' | 'PAUSED' | 'CLOSED'

export type VulnerabilityStatus = 'PENDING' | 'ESCALATED' | 'ACCEPTED' | 'REJECTED' | 'DUPLICATE'
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

export interface KnowledgeGraphEntity {
  id: string
  type: string
  name: string
  properties?: Record<string, unknown>
}

export interface KnowledgeGraphRelation {
  sourceId: string
  targetId: string
  type: string
  properties?: Record<string, unknown>
}

export interface ReportGraphContext {
  reporterAgent?: string
  vulnerabilityClass?: string
  affectedAsset?: string
  affectedComponent?: string
  attackVector?: string
  rootCause?: string
  prerequisites?: string
  referenceIds: readonly string[]
  transactionHashes: readonly string[]
  contractAddresses: readonly string[]
  repositoryLinks: readonly string[]
  filePaths: readonly string[]
  tags: readonly string[]
}

export interface ReportStructuredData {
  version: string
  narrative?: {
    title: string
    summary: string
    impact: string
    proof: string
    severity: Severity
    source: ReportSource
  }
  graphContext: ReportGraphContext
  artifacts?: {
    codeSnippet?: string
    errorLocation?: string
  }
  entities: readonly KnowledgeGraphEntity[]
  relations: readonly KnowledgeGraphRelation[]
}

export interface VulnerabilityInput {
  title: string
  severity: Severity
  target: string
  summary: string
  impact: string
  proof: string
  codeSnippet?: string
  errorLocation?: string
}

export interface ReportSubmissionInput {
  programId: string
  reporterName: string
  title: string
  source?: ReportSource
  vulnerabilities: VulnerabilityInput[]
  graphContext?: Partial<ReportGraphContext>
  knowledgeGraph?: {
    entities: readonly KnowledgeGraphEntity[]
    relations: readonly KnowledgeGraphRelation[]
  }
}

export interface Vulnerability {
  id: string
  reportId: string
  title: string
  severity: Severity
  target: string
  summary: string
  impact: string
  proof: string
  status: VulnerabilityStatus
  codeSnippet?: string | null
  errorLocation?: string | null
  validationDecision?: ValidationAction | null
  validationNotes?: string | null
  rewardPaidUsd?: number | null
  rewardTxHash?: string | null
}

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
  sourceCode?: string
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
  status: ProgramStatus
  isNew: boolean
  triagedLabel: string
  maxBountyUsd: number
  paidUsd: number
  scopeReviews: number
  startedAt: string
  publishedAt?: string | null
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
  reports: readonly ReportSnapshot[]
  _count?: {
    reports: number
  }
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
  slug?: string | null
  rank?: number
  score?: number
  minerName?: string
  validatorScore?: number
  headline: string
  summary: string
  walletAddress?: string | null
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
  programName?: string
  programCode?: string
  program?: Partial<Program> & { ownerId?: string | null }
  reporter?: {
    id: string
    name: string
    email: string
  }
  reporterId?: string | null
  reporterName: string
  title: string
  status: SubmissionStatus
  source: ReportSource
  route: string
  responseSla?: string | null
  nextAction?: string | null
  submittedAt: string
  resolvedAt?: string | null
  updatedAt?: string
  decisionOwner?: string | null
  rewardEstimateUsd?: number | null
  note?: string | null
  structuredData?: ReportStructuredData | null
  aiScore?: number | null
  aiSummary?: string | null
  vulnerabilities: readonly Vulnerability[]
}
