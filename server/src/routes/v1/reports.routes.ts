import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import {
    submitReportSchema,
    updateReportStatusSchema,
    reportQuerySchema,
} from '../../schemas/report.schema'
import {
    agentSubmitReportSchema,
    validateReportSchema,
    type AgentSubmitReportInput,
} from '../../schemas/submission.schema'
import { assessReportEffort, runAiTriage } from '../../lib/triage.service'
import { authMiddleware, requireRole, submissionAuthMiddleware } from '../../middleware/auth'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import type { HonoEnv } from '../../types/hono'

export const reportRoutes = new Hono<HonoEnv>()

const reportInclude = {
    program: {
        select: {
            id: true,
            code: true,
            name: true,
            responseSla: true,
            payoutCurrency: true,
            ownerId: true,
        },
    },
    reporter: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
} satisfies Prisma.ReportInclude

type ReportWithRelations = Prisma.ReportGetPayload<{ include: typeof reportInclude }>

function normalizeOptionalText(value?: string | null) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
}

function normalizeList(values?: string[]) {
    return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))
}

function slugify(value: string) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return normalized || 'item'
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
    const seen = new Set<string>()
    return items.filter((item) => {
        const key = getKey(item)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function serializeReport(report: ReportWithRelations) {
    return {
        ...report,
        programName: report.program.name,
        programCode: report.program.code,
    }
}

function canAccessReport(user: HonoEnv['Variables']['user'], report: ReportWithRelations) {
    if (user.role === 'ADMIN') return true
    if (user.role === 'BOUNTY_HUNTER') return report.reporterId === user.sub
    return true
}

function buildStructuredData(
    body: AgentSubmitReportInput,
    program: { id: string; code: string; name: string }
) {
    const graphContext = {
        ...(normalizeOptionalText(body.graphContext?.reporterAgent)
            ? { reporterAgent: normalizeOptionalText(body.graphContext?.reporterAgent) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.vulnerabilityClass)
            ? { vulnerabilityClass: normalizeOptionalText(body.graphContext?.vulnerabilityClass) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.affectedAsset)
            ? { affectedAsset: normalizeOptionalText(body.graphContext?.affectedAsset) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.affectedComponent)
            ? { affectedComponent: normalizeOptionalText(body.graphContext?.affectedComponent) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.attackVector)
            ? { attackVector: normalizeOptionalText(body.graphContext?.attackVector) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.rootCause)
            ? { rootCause: normalizeOptionalText(body.graphContext?.rootCause) }
            : {}),
        ...(normalizeOptionalText(body.graphContext?.prerequisites)
            ? { prerequisites: normalizeOptionalText(body.graphContext?.prerequisites) }
            : {}),
        referenceIds: normalizeList(body.graphContext?.referenceIds),
        transactionHashes: normalizeList(body.graphContext?.transactionHashes),
        contractAddresses: normalizeList(body.graphContext?.contractAddresses),
        repositoryLinks: normalizeList(body.graphContext?.repositoryLinks),
        filePaths: normalizeList(body.graphContext?.filePaths),
        tags: normalizeList(body.graphContext?.tags),
    }

    const findingId = 'finding:' + slugify(body.title)
    const programEntityId = 'program:' + program.id
    const targetEntityId = 'target:' + slugify(body.target)
    const componentName =
        normalizeOptionalText(body.graphContext?.affectedComponent) ?? normalizeOptionalText(body.errorLocation) ?? body.target
    const componentEntityId = 'component:' + slugify(componentName)
    const assetName = normalizeOptionalText(body.graphContext?.affectedAsset) ?? body.target
    const assetEntityId = 'asset:' + slugify(assetName)
    const vulnerabilityName = normalizeOptionalText(body.graphContext?.vulnerabilityClass) ?? body.title
    const vulnerabilityEntityId = 'vulnerability:' + slugify(vulnerabilityName)
    const reporterEntityId = 'reporter:' + slugify(body.reporterName)
    const agentName = normalizeOptionalText(body.graphContext?.reporterAgent)
    const agentEntityId = agentName ? 'agent:' + slugify(agentName) : undefined

    const derivedEntities = [
        {
            id: findingId,
            type: 'Finding',
            name: body.title,
            properties: {
                severity: body.severity,
                summary: body.summary,
                impact: body.impact,
                proof: body.proof,
                source: body.source,
            },
        },
        {
            id: programEntityId,
            type: 'Program',
            name: program.name,
            properties: {
                programId: program.id,
                programCode: program.code,
            },
        },
        {
            id: targetEntityId,
            type: 'Target',
            name: body.target,
            properties: {
                target: body.target,
            },
        },
        {
            id: componentEntityId,
            type: 'Component',
            name: componentName,
            properties: {
                ...(normalizeOptionalText(body.errorLocation) ? { errorLocation: normalizeOptionalText(body.errorLocation) } : {}),
            },
        },
        {
            id: assetEntityId,
            type: 'Asset',
            name: assetName,
            properties: {
                tags: graphContext.tags,
            },
        },
        {
            id: vulnerabilityEntityId,
            type: 'Vulnerability',
            name: vulnerabilityName,
            properties: {
                ...(normalizeOptionalText(body.graphContext?.attackVector) ? { attackVector: normalizeOptionalText(body.graphContext?.attackVector) } : {}),
                ...(normalizeOptionalText(body.graphContext?.rootCause) ? { rootCause: normalizeOptionalText(body.graphContext?.rootCause) } : {}),
            },
        },
        {
            id: reporterEntityId,
            type: 'Reporter',
            name: body.reporterName,
            properties: {
                actorType: 'BountyHunter',
            },
        },
        ...(agentName && agentEntityId
            ? [{
                id: agentEntityId,
                type: 'Agent',
                name: agentName,
                properties: {
                    role: 'Reporter assistant',
                },
            }]
            : []),
    ]

    const derivedRelations = [
        {
            sourceId: findingId,
            targetId: programEntityId,
            type: 'BELONGS_TO_PROGRAM',
        },
        {
            sourceId: findingId,
            targetId: targetEntityId,
            type: 'TARGETS',
        },
        {
            sourceId: findingId,
            targetId: componentEntityId,
            type: 'AFFECTS_COMPONENT',
        },
        {
            sourceId: findingId,
            targetId: assetEntityId,
            type: 'AFFECTS_ASSET',
        },
        {
            sourceId: findingId,
            targetId: vulnerabilityEntityId,
            type: 'HAS_VULNERABILITY_CLASS',
        },
        {
            sourceId: findingId,
            targetId: reporterEntityId,
            type: 'REPORTED_BY',
        },
        ...(agentEntityId
            ? [{
                sourceId: findingId,
                targetId: agentEntityId,
                type: 'DETECTED_WITH_AGENT',
            }]
            : []),
    ]

    const submittedEntities = body.knowledgeGraph?.entities ?? []
    const submittedRelations = body.knowledgeGraph?.relations ?? []

    return {
        version: 'report-kg-seed/v1',
        narrative: {
            title: body.title,
            summary: body.summary,
            impact: body.impact,
            proof: body.proof,
            severity: body.severity,
            source: body.source,
        },
        graphContext,
        artifacts: {
            ...(normalizeOptionalText(body.codeSnippet) ? { codeSnippet: normalizeOptionalText(body.codeSnippet) } : {}),
            ...(normalizeOptionalText(body.errorLocation) ? { errorLocation: normalizeOptionalText(body.errorLocation) } : {}),
        },
        entities: dedupeByKey([...submittedEntities, ...derivedEntities], (entity) => entity.id),
        relations: dedupeByKey(
            [...submittedRelations, ...derivedRelations],
            (relation) => relation.sourceId + ':' + relation.targetId + ':' + relation.type
        ),
    }
}

async function generateHumanId(programCode: string) {
    const count = await prisma.report.count({
        where: {
            program: {
                code: programCode,
            },
        },
    })

    return programCode + '-R' + String(count + 1).padStart(3, '0')
}

async function createReportFromSubmission(body: AgentSubmitReportInput, reporterId: string) {
    const program = await prisma.program.findUnique({
        where: { id: body.programId },
        select: {
            id: true,
            code: true,
            name: true,
            responseSla: true,
        },
    })

    if (!program) return null

    const humanId = await generateHumanId(program.code)
    const structuredData = buildStructuredData(body, program)
    const effort = assessReportEffort({
        title: body.title,
        summary: body.summary,
        impact: body.impact,
        proof: body.proof,
        severity: body.severity,
        codeSnippet: body.codeSnippet,
        errorLocation: body.errorLocation,
        graphContext: structuredData.graphContext,
    })

    const baseData = {
        humanId,
        programId: body.programId,
        reporterId,
        reporterName: body.reporterName,
        title: body.title,
        severity: body.severity,
        target: body.target,
        summary: body.summary,
        impact: body.impact,
        proof: body.proof,
        source: body.source,
        responseSla: program.responseSla,
        codeSnippet: normalizeOptionalText(body.codeSnippet),
        errorLocation: normalizeOptionalText(body.errorLocation),
        structuredData: structuredData as Prisma.InputJsonValue,
    }

    if (effort.isLowEffort) {
        const report = await prisma.report.create({
            data: {
                ...baseData,
                status: 'LOW_EFFORT',
                route: 'Low-effort filter',
                nextAction: 'Add stronger impact and replay evidence before resubmitting.',
                note: effort.reasons.join(' '),
            },
            include: reportInclude,
        })

        return serializeReport(report)
    }

    const aiResult = await runAiTriage({
        title: body.title,
        summary: body.summary,
        impact: body.impact,
        proof: body.proof,
        severity: body.severity,
        codeSnippet: body.codeSnippet,
        errorLocation: body.errorLocation,
        graphContext: structuredData.graphContext,
    })

    const report = await prisma.report.create({
        data: {
            ...baseData,
            status: 'AI_TRIAGED',
            route: aiResult.route,
            aiScore: aiResult.score,
            aiSummary: aiResult.summary,
            nextAction: aiResult.nextAction,
        },
        include: reportInclude,
    })

    return serializeReport(report)
}

reportRoutes.get('/', authMiddleware, zValidator('query', reportQuerySchema), async (c) => {
    const q = c.req.valid('query')
    const user = c.get('user')

    const where: Prisma.ReportWhereInput = {
        ...(user.role === 'BOUNTY_HUNTER' ? { reporterId: user.sub } : {}),
        ...(q.programId ? { programId: q.programId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.severity ? { severity: q.severity } : {}),
    }

    const skip = (q.page - 1) * q.limit

    const [total, reports] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.findMany({
            where,
            skip,
            take: q.limit,
            orderBy: { submittedAt: 'desc' },
            include: reportInclude,
        }),
    ])

    return paginatedResponse(c, reports.map(serializeReport), total, q.page, q.limit)
})

reportRoutes.get('/:id', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const user = c.get('user')

    const report = await prisma.report.findUnique({
        where: { id },
        include: reportInclude,
    })

    if (!report) return errorResponse(c, 404, 'Report not found')
    if (!canAccessReport(user, report)) return errorResponse(c, 403, 'Forbidden')

    return successResponse(c, serializeReport(report))
})

reportRoutes.post(
    '/',
    submissionAuthMiddleware,
    requireRole('BOUNTY_HUNTER', 'ADMIN'),
    zValidator('json', submitReportSchema),
    async (c) => {
        const body = c.req.valid('json')
        const user = c.get('user')

        const report = await createReportFromSubmission(body, user.sub)
        if (!report) return errorResponse(c, 404, 'Program not found')

        return successResponse(c, report, 201)
    }
)

reportRoutes.patch(
    '/:id/status',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', updateReportStatusSchema),
    async (c) => {
        const { id } = c.req.param()
        const body = c.req.valid('json')
        const user = c.get('user')

        const report = await prisma.report.findUnique({
            where: { id },
            include: reportInclude,
        })

        if (!report) return errorResponse(c, 404, 'Report not found')
        if (!canAccessReport(user, report)) return errorResponse(c, 403, 'Forbidden')

        const updated = await prisma.report.update({
            where: { id },
            data: {
                status: body.status,
                ...(body.decisionOwner ? { decisionOwner: body.decisionOwner } : {}),
                ...(body.rewardEstimateUsd !== undefined ? { rewardEstimateUsd: body.rewardEstimateUsd } : {}),
                ...(body.note ? { note: body.note } : {}),
                ...(body.nextAction ? { nextAction: body.nextAction } : {}),
                ...(body.status === 'RESOLVED' || body.status === 'ACCEPTED' || body.status === 'REJECTED'
                    ? { resolvedAt: new Date() }
                    : {}),
            },
            include: reportInclude,
        })

        return successResponse(c, serializeReport(updated))
    }
)

reportRoutes.post(
    '/submit',
    submissionAuthMiddleware,
    requireRole('BOUNTY_HUNTER', 'ADMIN'),
    zValidator('json', agentSubmitReportSchema),
    async (c) => {
        const body = c.req.valid('json')
        const user = c.get('user')

        const report = await createReportFromSubmission(body, user.sub)
        if (!report) return errorResponse(c, 404, 'Program not found')

        return successResponse(c, report, 201)
    }
)

reportRoutes.post(
    '/:id/validate',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', validateReportSchema),
    async (c) => {
        const { id } = c.req.param()
        const body = c.req.valid('json')
        const user = c.get('user')

        const report = await prisma.report.findUnique({
            where: { id },
            include: reportInclude,
        })

        if (!report) return errorResponse(c, 404, 'Report not found')
        if (!canAccessReport(user, report)) return errorResponse(c, 403, 'Forbidden')

        if (!['AI_TRIAGED', 'TRIAGED', 'ESCALATED'].includes(report.status)) {
            return errorResponse(c, 400, 'Only triaged reports can be validated')
        }

        const validator = await prisma.user.findUnique({
            where: { id: user.sub },
            select: { name: true, organizationName: true },
        })

        const decisionOwner = validator?.organizationName ?? validator?.name ?? user.email
        const statusMap = {
            ACCEPT: 'ACCEPTED',
            REJECT: 'REJECTED',
            ESCALATE: 'ESCALATED',
        } as const
        const nextActionMap = {
            ACCEPT: 'Accepted by the organization validator and kept for downstream bounty processing.',
            REJECT: 'Rejected by the organization validator and closed in the queue.',
            ESCALATE: 'Escalated by the organization validator for lead security review.',
        } as const

        const updated = await prisma.report.update({
            where: { id },
            data: {
                status: statusMap[body.action],
                decisionOwner,
                validationDecision: body.action,
                validationNotes: normalizeOptionalText(body.notes),
                note: normalizeOptionalText(body.notes) ?? report.note,
                nextAction: nextActionMap[body.action],
                ...(body.action === 'ESCALATE' ? {} : { resolvedAt: new Date() }),
            },
            include: reportInclude,
        })

        return successResponse(c, serializeReport(updated))
    }
)
