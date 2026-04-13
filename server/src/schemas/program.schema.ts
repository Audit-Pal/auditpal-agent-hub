import { z } from 'zod'

const severityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
const programKindEnum = z.enum(['BUG_BOUNTY', 'CROWDSOURCED_AUDIT', 'ATTACK_SIMULATION'])
const categoryEnum = z.enum(['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN'])
const platformEnum = z.enum(['ETHEREUM', 'ARBITRUM', 'BASE', 'MONAD', 'SUI', 'SOLANA', 'OFFCHAIN'])
const languageEnum = z.enum(['SOLIDITY', 'RUST', 'TYPESCRIPT', 'SWIFT', 'GO', 'MOVE'])
const envEnum = z.enum(['MAINNET', 'TESTNET', 'PRODUCTION', 'STAGING', 'OFFCHAIN', 'AUDIT'])
const refKindEnum = z.enum([
    'SOURCE_FILE', 'GITHUB_REPO', 'GITHUB_ORG', 'GITHUB_PROFILE',
    'CONTRACT_ADDRESS', 'PACKAGE', 'SERVICE', 'RUNBOOK', 'DOMAIN',
])

const rewardTierSchema = z.object({
    severity: severityEnum,
    maxRewardUsd: z.number().int().positive(),
    triageSla: z.string(),
    payoutWindow: z.string(),
    examples: z.array(z.string()).min(1),
})

const scopeTargetSchema = z.object({
    label: z.string(),
    location: z.string(),
    assetType: z.string(),
    severity: severityEnum,
    reviewStatus: z.string(),
    note: z.string(),
    referenceKind: refKindEnum.optional(),
    referenceValue: z.string().optional(),
    referenceUrl: z.string().url().optional(),
    network: z.string().optional(),
    environment: envEnum.optional(),
    tags: z.array(z.string()).optional(),
})

const triageStageSchema = z.object({
    order: z.number().int().min(0),
    title: z.string(),
    owner: z.string(),
    automation: z.string(),
    trigger: z.string(),
    outputs: z.array(z.string()),
    humanGate: z.string(),
})

const policySectionSchema = z.object({
    order: z.number().int().min(0),
    title: z.string(),
    items: z.array(z.string()).min(1),
})

export const createProgramSchema = z.object({
    id: z.string().min(3).max(80),
    code: z.string().min(2).max(20),
    name: z.string().min(3).max(120),
    company: z.string().min(2).max(120),
    kind: programKindEnum,
    tagline: z.string().max(200),
    description: z.string().min(20),
    accentTone: z.string().default('mint'),
    logoMark: z.string().max(4),
    isNew: z.boolean().default(false),
    maxBountyUsd: z.number().int().positive(),
    paidUsd: z.number().int().min(0).default(0),
    scopeReviews: z.number().int().min(0).default(0),
    startedAt: z.string().datetime(),
    reputationRequired: z.number().int().min(0).default(0),
    pocRequired: z.boolean().default(true),
    liveMessage: z.string().default('Live program is active now'),
    responseSla: z.string(),
    payoutCurrency: z.string().default('USDC'),
    payoutWindow: z.string(),
    duplicatePolicy: z.string(),
    disclosureModel: z.string(),
    categories: z.array(categoryEnum).min(1),
    platforms: z.array(platformEnum).min(1),
    languages: z.array(languageEnum).min(1),
    summaryHighlights: z.array(z.string()).min(1).max(6),
    submissionChecklist: z.array(z.string()).min(1),
    rewardTiers: z.array(rewardTierSchema).length(4),
    scopeTargets: z.array(scopeTargetSchema).min(1),
    triageStages: z.array(triageStageSchema).min(1),
    policySections: z.array(policySectionSchema).min(1),

    // Credentials for checkers
    gatekeeperEmail: z.string().email().optional(),
    gatekeeperPassword: z.string().min(8).optional(),
    validatorEmail: z.string().email().optional(),
    validatorPassword: z.string().min(8).optional(),
})

export const updateProgramSchema = createProgramSchema.partial().omit({ id: true, code: true })

export const programQuerySchema = z.object({
    search: z.string().optional(),
    kind: programKindEnum.optional(),
    category: categoryEnum.optional(),
    platform: platformEnum.optional(),
    language: languageEnum.optional(),
    sortBy: z.enum(['recent', 'bounty', 'name', 'reviews']).default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>
export type ProgramQuery = z.infer<typeof programQuerySchema>
