import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import {
    submitReportSchema,
    updateReportStatusSchema,
    reportQuerySchema,
} from '../../schemas/report.schema'
import { authMiddleware, requireRole } from '../../middleware/auth'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import { Prisma } from '@prisma/client'

export const reportRoutes = new Hono()

/** Generate human-readable report ID like "AP-1021-R003" */
async function generateHumanId(programCode: string): Promise<string> {
    const count = await prisma.report.count({ where: { program: { code: programCode } } })
    return `${programCode}-R${String(count + 1).padStart(3, '0')}`
}

// ── GET /reports ──────────────────────────────────────────────────────────────
reportRoutes.get('/', authMiddleware, zValidator('query', reportQuerySchema), async (c) => {
    const q = c.req.valid('query')
    const user = c.get('user')

    const where: Prisma.ReportWhereInput = {
        // Bounty hunters only see their own reports; admins see all
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
            include: {
                program: { select: { id: true, code: true, name: true, responseSla: true } },
                reporter: { select: { id: true, name: true, email: true } },
            },
        }),
    ])

    return paginatedResponse(c, reports, total, q.page, q.limit)
})

// ── GET /reports/:id ──────────────────────────────────────────────────────────
reportRoutes.get('/:id', authMiddleware, async (c) => {
    const { id } = c.req.param()
    const user = c.get('user')

    const report = await prisma.report.findUnique({
        where: { id },
        include: {
            program: { select: { id: true, code: true, name: true, responseSla: true, payoutCurrency: true } },
            reporter: { select: { id: true, name: true, email: true } },
        },
    })

    if (!report) return errorResponse(c, 404, 'Report not found')

    // Bounty hunter can only see their own
    if (user.role === 'BOUNTY_HUNTER' && report.reporterId !== user.sub) {
        return errorResponse(c, 403, 'Forbidden')
    }

    return successResponse(c, report)
})

// ── POST /reports ─────────────────────────────────────────────────────────────
reportRoutes.post(
    '/',
    authMiddleware,
    requireRole('BOUNTY_HUNTER', 'ADMIN'),
    zValidator('json', submitReportSchema),
    async (c) => {
        const body = c.req.valid('json')
        const user = c.get('user')

        const program = await prisma.program.findUnique({
            where: { id: body.programId },
            select: { id: true, code: true, responseSla: true, reputationRequired: true },
        })
        if (!program) return errorResponse(c, 404, 'Program not found')

        // Check reputation requirement for bounty hunters
        if (user.role === 'BOUNTY_HUNTER') {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.sub },
                select: { reputation: true },
            })
            if ((dbUser?.reputation ?? 0) < program.reputationRequired) {
                return errorResponse(c, 403, `Minimum reputation of ${program.reputationRequired} required`)
            }
        }

        const humanId = await generateHumanId(program.code)
        const route =
            body.severity === 'CRITICAL' || body.severity === 'HIGH'
                ? 'Priority triage queue'
                : 'Standard intake queue'

        const report = await prisma.report.create({
            data: {
                humanId,
                programId: body.programId,
                reporterId: user.sub,
                reporterName: body.reporterName,
                title: body.title,
                severity: body.severity,
                target: body.target,
                summary: body.summary,
                impact: body.impact,
                proof: body.proof,
                source: body.source,
                route,
                responseSla: program.responseSla,
                nextAction: `Expect a first triage touch within ${program.responseSla}.`,
            },
            include: {
                program: { select: { id: true, code: true, name: true } },
            },
        })

        return successResponse(c, report, 201)
    }
)

// ── PATCH /reports/:id/status (admin triage) ──────────────────────────────────
reportRoutes.patch(
    '/:id/status',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', updateReportStatusSchema),
    async (c) => {
        const { id } = c.req.param()
        const body = c.req.valid('json')

        const report = await prisma.report.findUnique({ where: { id } })
        if (!report) return errorResponse(c, 404, 'Report not found')

        const updated = await prisma.report.update({
            where: { id },
            data: {
                status: body.status,
                ...(body.decisionOwner ? { decisionOwner: body.decisionOwner } : {}),
                ...(body.rewardEstimateUsd !== undefined ? { rewardEstimateUsd: body.rewardEstimateUsd } : {}),
                ...(body.note ? { note: body.note } : {}),
                ...(body.nextAction ? { nextAction: body.nextAction } : {}),
                ...(body.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
            },
        })

        return successResponse(c, updated)
    }
)
