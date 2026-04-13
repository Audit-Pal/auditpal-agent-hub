import { z } from 'zod'

const severityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
const reportSourceEnum = z.enum(['CROWD_REPORT', 'EXPLOIT_FEED', 'AGENT_DISAGREEMENT'])

const knowledgeGraphEntitySchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    properties: z.record(z.any()).optional(),
})

const knowledgeGraphRelationSchema = z.object({
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
    type: z.string().min(1),
    properties: z.record(z.any()).optional(),
})

export const knowledgeGraphSchema = z.object({
    entities: z.array(knowledgeGraphEntitySchema).default([]),
    relations: z.array(knowledgeGraphRelationSchema).default([]),
})

export const graphContextSchema = z.object({
    reporterAgent: z.string().trim().min(2).max(120).optional(),
    vulnerabilityClass: z.string().trim().min(2).max(120).optional(),
    affectedAsset: z.string().trim().min(2).max(160).optional(),
    affectedComponent: z.string().trim().min(2).max(160).optional(),
    attackVector: z.string().trim().min(5).max(240).optional(),
    rootCause: z.string().trim().min(10).optional(),
    prerequisites: z.string().trim().min(5).optional(),
    referenceIds: z.array(z.string().trim().min(1)).default([]),
    transactionHashes: z.array(z.string().trim().min(1)).default([]),
    contractAddresses: z.array(z.string().trim().min(1)).default([]),
    repositoryLinks: z.array(z.string().trim().min(1)).default([]),
    filePaths: z.array(z.string().trim().min(1)).default([]),
    tags: z.array(z.string().trim().min(1)).default([]),
})

export const vulnerabilityItemSchema = z.object({
    title: z.string().min(5).max(200),
    severity: severityEnum,
    target: z.string().min(1),
    summary: z.string().min(20),
    impact: z.string().min(10),
    proof: z.string().min(10),
    codeSnippet: z.string().trim().optional(),
    errorLocation: z.string().trim().optional(),
}).superRefine((value, ctx) => {
    if (value.codeSnippet && !value.errorLocation) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['errorLocation'],
            message: 'Provide the error location when attaching a code snippet.',
        })
    }
})

export const agentSubmitReportSchema = z.object({
    programId: z.string().min(1),
    title: z.string().min(5).max(200),
    reporterName: z.string().min(2).max(100),
    source: reportSourceEnum.default('CROWD_REPORT'),
    vulnerabilities: z.array(vulnerabilityItemSchema).min(1),
    graphContext: graphContextSchema.optional(),
    knowledgeGraph: knowledgeGraphSchema.optional(),
})

export const validateReportSchema = z.object({
    action: z.enum(['ACCEPT', 'REJECT', 'ESCALATE']),
    notes: z.string().trim().max(2000).optional(),
    rewardAmount: z.number().nonnegative().optional(),
    severity: severityEnum.optional(),
})

export type AgentSubmitReportInput = z.infer<typeof agentSubmitReportSchema>
export type ValidateReportInput = z.infer<typeof validateReportSchema>
export type GraphContextInput = z.infer<typeof graphContextSchema>
export type KnowledgeGraphInput = z.infer<typeof knowledgeGraphSchema>
