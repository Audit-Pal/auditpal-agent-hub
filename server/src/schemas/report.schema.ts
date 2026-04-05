import { z } from 'zod'

const severityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
const reportSourceEnum = z.enum(['CROWD_REPORT', 'EXPLOIT_FEED', 'AGENT_DISAGREEMENT'])
const reportStatusEnum = z.enum(['SUBMITTED', 'NEEDS_INFO', 'TRIAGED', 'DUPLICATE', 'REJECTED', 'RESOLVED'])

export const submitReportSchema = z.object({
    programId: z.string().min(1),
    title: z.string().min(5).max(200),
    severity: severityEnum,
    target: z.string().min(1),
    summary: z.string().min(20),
    impact: z.string().min(10),
    proof: z.string().min(10),
    reporterName: z.string().min(2).max(100),
    source: reportSourceEnum.default('CROWD_REPORT'),
})

export const updateReportStatusSchema = z.object({
    status: reportStatusEnum,
    decisionOwner: z.string().optional(),
    rewardEstimateUsd: z.number().int().min(0).optional(),
    note: z.string().optional(),
    nextAction: z.string().optional(),
})

export const reportQuerySchema = z.object({
    programId: z.string().optional(),
    status: reportStatusEnum.optional(),
    severity: severityEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SubmitReportInput = z.infer<typeof submitReportSchema>
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>
export type ReportQuery = z.infer<typeof reportQuerySchema>
