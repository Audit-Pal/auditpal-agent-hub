import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import {
    submitReportSchema,
    updateReportStatusSchema,
    reportQuerySchema,
    editReportSchema,
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
            gatekeeperId: true,
            validatorId: true,
        },
    },
    reporter: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    vulnerabilities: true,
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
    
    // Organization-level isolation
    if (user.role === 'ORGANIZATION') return report.program.ownerId === user.sub
    if (user.role === 'GATEKEEPER') return report.program.gatekeeperId === user.sub
    if (user.role === 'VALIDATOR') return report.program.validatorId === user.sub
    
    return false
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

    const primaryVuln = body.vulnerabilities[0]
    const findingId = 'finding:' + slugify(primaryVuln.title)
    const programEntityId = 'program:' + program.id
    const targetEntityId = 'target:' + slugify(primaryVuln.target)
    const componentName =
        normalizeOptionalText(body.graphContext?.affectedComponent) ?? normalizeOptionalText(primaryVuln.errorLocation) ?? primaryVuln.target
    const componentEntityId = 'component:' + slugify(componentName)
    const assetName = normalizeOptionalText(body.graphContext?.affectedAsset) ?? primaryVuln.target
    const assetEntityId = 'asset:' + slugify(assetName)
    const vulnerabilityName = normalizeOptionalText(body.graphContext?.vulnerabilityClass) ?? primaryVuln.title
    const vulnerabilityEntityId = 'vulnerability:' + slugify(vulnerabilityName)
    const reporterEntityId = 'reporter:' + slugify(body.reporterName)
    const agentName = normalizeOptionalText(body.graphContext?.reporterAgent)
    const agentEntityId = agentName ? 'agent:' + slugify(agentName) : undefined

    const derivedEntities = [
        {
            id: findingId,
            type: 'Finding',
            name: primaryVuln.title,
            properties: {
                severity: primaryVuln.severity,
                summary: primaryVuln.summary,
                impact: primaryVuln.impact,
                proof: primaryVuln.proof,
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
            name: primaryVuln.target,
            properties: {
                target: primaryVuln.target,
            },
        },
        {
            id: componentEntityId,
            type: 'Component',
            name: componentName,
            properties: {
                ...(normalizeOptionalText(primaryVuln.errorLocation) ? { errorLocation: normalizeOptionalText(primaryVuln.errorLocation) } : {}),
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
            summary: primaryVuln.summary,
            impact: primaryVuln.impact,
            proof: primaryVuln.proof,
            severity: primaryVuln.severity,
            source: body.source,
        },
        graphContext,
        artifacts: {
            ...(normalizeOptionalText(primaryVuln.codeSnippet) ? { codeSnippet: normalizeOptionalText(primaryVuln.codeSnippet) } : {}),
            ...(normalizeOptionalText(primaryVuln.errorLocation) ? { errorLocation: normalizeOptionalText(primaryVuln.errorLocation) } : {}),
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
    const primaryVuln = body.vulnerabilities[0]
    const effort = assessReportEffort({
        title: primaryVuln.title,
        summary: primaryVuln.summary,
        impact: primaryVuln.impact,
        proof: primaryVuln.proof,
        severity: primaryVuln.severity,
        codeSnippet: primaryVuln.codeSnippet,
        errorLocation: primaryVuln.errorLocation,
        graphContext: structuredData.graphContext,
    })

    const baseData = {
        humanId,
        programId: body.programId,
        reporterId,
        reporterName: body.reporterName,
        title: body.title,
        source: body.source,
        responseSla: program.responseSla,
        structuredData: structuredData as Prisma.InputJsonValue,
        vulnerabilities: {
            create: body.vulnerabilities.map(v => ({
                title: v.title,
                severity: v.severity,
                target: v.target,
                summary: v.summary,
                impact: v.impact,
                proof: v.proof,
                codeSnippet: normalizeOptionalText(v.codeSnippet),
                errorLocation: normalizeOptionalText(v.errorLocation),
            }))
        }
    }

    if (effort.isLowEffort) {
        const report = await prisma.report.create({
            data: {
                ...baseData,
                status: 'TRIAGED',
                route: 'Low-effort filter',
                nextAction: 'Add stronger impact and replay evidence before resubmitting.',
                note: effort.reasons.join(' '),
            },
            include: reportInclude,
        })

        return serializeReport(report)
    }

    const aiResult = await runAiTriage({
        title: primaryVuln.title,
        summary: primaryVuln.summary,
        impact: primaryVuln.impact,
        proof: primaryVuln.proof,
        severity: primaryVuln.severity,
        codeSnippet: primaryVuln.codeSnippet,
        errorLocation: primaryVuln.errorLocation,
        graphContext: structuredData.graphContext,
    })

    const report = await prisma.report.create({
        data: {
            ...baseData,
            status: 'TRIAGED',
            route: aiResult.route,
            aiScore: aiResult.score,
            aiSummary: aiResult.summary,
            nextAction: aiResult.nextAction,
        },
        include: reportInclude,
    })

    return serializeReport(report)
}

// ── GET /reports/public (no auth) ────────────────────────────────────────────
reportRoutes.get('/public', async (c) => {
    const reports = await prisma.report.findMany({
        select: {
            id: true,
            title: true,
            status: true,
            submittedAt: true,
            rewardEstimateUsd: true,
            program: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
            vulnerabilities: {
                select: { severity: true },
                take: 1,
                orderBy: { severity: 'asc' },
            },
        },
        orderBy: { submittedAt: 'desc' },
        take: 100,
    })

    const data = reports.map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.vulnerabilities[0]?.severity ?? 'LOW',
        status: r.status,
        submittedAt: r.submittedAt,
        rewardEstimateUsd: r.rewardEstimateUsd,
        bountyName: r.program.name,
        programId: r.program.id,
        programCode: r.program.code,
        accepted: ['RESOLVED', 'ACCEPTED'].includes(r.status),
    }))

    return successResponse(c, data)
})

reportRoutes.get('/', authMiddleware, zValidator('query', reportQuerySchema), async (c) => {
    const q = c.req.valid('query')
    const user = c.get('user')

    const where: Prisma.ReportWhereInput = {
        ...(user.role === 'BOUNTY_HUNTER' ? { reporterId: user.sub } : {}),
        ...(user.role === 'ORGANIZATION' ? { program: { ownerId: user.sub } } : {}),
        ...(user.role === 'GATEKEEPER' ? { program: { gatekeeperId: user.sub } } : {}),
        ...(user.role === 'VALIDATOR' ? { program: { validatorId: user.sub } } : {}),
        ...(q.programId ? { programId: q.programId } : {}),
        ...(q.status ? { status: q.status } : {}),
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

// ── GET /reports/escalated ─────────────────────────────────────────────────────
reportRoutes.get('/escalated', authMiddleware, requireRole('VALIDATOR', 'ADMIN'), async (c) => {
    const reports = await prisma.report.findMany({
        where: { status: 'ESCALATED' },
        include: reportInclude,
        orderBy: { updatedAt: 'desc' },
    })
    return successResponse(c, reports.map(serializeReport))
})

// ── POST /vulnerabilities/:id/validate ──────────────────────────────────────
reportRoutes.post('/vulnerabilities/:id/validate', authMiddleware, requireRole('GATEKEEPER', 'VALIDATOR', 'ADMIN'), zValidator('json', validateReportSchema), async (c) => {
    const { id } = c.req.param()
    const { action, notes, rewardAmount } = c.req.valid('json')
    const user = c.get('user')

    const vulnerability = await prisma.vulnerability.findUnique({
        where: { id },
    })

    if (!vulnerability) return errorResponse(c, 404, 'Vulnerability not found')

    const statusMap = {
        ACCEPT: 'ACCEPTED',
        REJECT: 'REJECTED',
        ESCALATE: 'ESCALATED',
    } as const

    const isAccepted = action === 'ACCEPT'
    const mockTxHash = isAccepted && rewardAmount ? '0x' + Math.random().toString(16).substring(2, 42) : null

    const updated = await prisma.vulnerability.update({
        where: { id },
        data: {
            status: statusMap[action] || 'PENDING',
            validationDecision: action,
            validationNotes: notes || null,
            ...(isAccepted ? { rewardPaidUsd: rewardAmount || 0, rewardTxHash: mockTxHash } : {}),
        },
    })

    const report = await prisma.report.findUnique({
        where: { id: updated.reportId },
        include: reportInclude,
    })

    return successResponse(c, serializeReport(report as any))
})

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

        if (!['AI_TRIAGED', 'TRIAGED', 'ESCALATED', 'SUBMITTED', 'LOW_EFFORT', 'NEEDS_INFO'].includes(report.status)) {
            return errorResponse(c, 400, 'Report status does not allow validation in this state')
        }

        const validatorUser = await prisma.user.findUnique({
            where: { id: user.sub },
            select: { name: true, organizationName: true },
        })

        const decisionOwner = validatorUser?.organizationName ?? validatorUser?.name ?? user.email
        const statusMap = {
            ACCEPT: 'ACCEPTED',
            REJECT: 'REJECTED',
            ESCALATE: 'ESCALATED',
        } as const

        const updated = await prisma.report.update({
            where: { id },
            data: {
                status: statusMap[body.action],
                decisionOwner,
                note: normalizeOptionalText(body.notes) ?? report.note,
                ...(body.action === 'ESCALATE' ? { route: 'Escalated to expert validator' } : { resolvedAt: new Date() }),
                ...(body.severity ? {
                    vulnerabilities: {
                        updateMany: {
                            where: { reportId: id },
                            data: { severity: body.severity }
                        }
                    },
                    // Also sync the structuredData narrative if it exists
                    ...(report.structuredData ? {
                        structuredData: {
                            ...(report.structuredData as any),
                            narrative: {
                                ...(report.structuredData as any).narrative,
                                severity: body.severity
                            }
                        } as any
                    } : {})
                } : {})
            },
            include: reportInclude,
        })

        return successResponse(c, serializeReport(updated))
    }
)

// ── POST /reports/:id/finalize ────────────────────────────────────────────────
reportRoutes.post(
    '/:id/finalize',
    authMiddleware,
    requireRole('VALIDATOR', 'ADMIN'),
    async (c) => {
        // We'll validate manually since async import in zValidator is tricky
        const body = await c.req.json()
        const { finalizeReportSchema } = await import('../../schemas/report.schema')
        const result = finalizeReportSchema.safeParse(body)
        if (!result.success) return errorResponse(c, 400, 'Invalid request body')
        const validBody = result.data
        const user = c.get('user')

        const { id } = c.req.param()
        const report = await prisma.report.findUnique({
            where: { id },
            include: reportInclude,
        })

        if (!report) return errorResponse(c, 404, 'Report not found')

        if (!['ESCALATED', 'ACCEPTED'].includes(report.status)) {
            return errorResponse(c, 400, 'Report must be escalated or accepted to be finalized')
        }

        const mockTxHash = '0x' + Math.random().toString(16).substring(2, 42)

        const updated = await prisma.report.update({
            where: { id: report.id },
            data: {
                status: 'RESOLVED',
                note: body.notes ?? report.note,
                resolvedAt: new Date(),
                decisionOwner: 'Platform Validator',
            },
            include: reportInclude,
        })

        return successResponse(c, serializeReport(updated))
    }
)

reportRoutes.patch(
    '/:id',
    authMiddleware,
    requireRole('BOUNTY_HUNTER', 'ADMIN'),
    zValidator('json', editReportSchema),
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

        // 1-hour edit window
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        if (report.submittedAt < oneHourAgo && user.role !== 'ADMIN') {
            return errorResponse(c, 400, 'Edit window has closed (1 hour limit)')
        }

        const updated = await prisma.report.update({
            where: { id },
            data: {
                title: body.title,
            },
            include: reportInclude,
        })

        return successResponse(c, serializeReport(updated))
    }
)
