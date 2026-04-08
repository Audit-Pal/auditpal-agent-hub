import { z } from 'zod'
import { agentSubmitReportSchema } from './submission.schema'

const severityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
export const reportStatusEnum = z.enum([
    'SUBMITTED',
    'NEEDS_INFO',
    'TRIAGED',
    'DUPLICATE',
    'REJECTED',
    'RESOLVED',
    'LOW_EFFORT',
    'AI_TRIAGE_PENDING',
    'AI_TRIAGED',
    'ESCALATED',
    'ACCEPTED',
])

export const submitReportSchema = agentSubmitReportSchema

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
