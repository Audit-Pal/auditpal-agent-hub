import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import {
    createProgramSchema,
    updateProgramSchema,
    programQuerySchema,
} from '../../schemas/program.schema'
import { authMiddleware, requireRole } from '../../middleware/auth'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import { Prisma } from '@prisma/client'
import type { HonoEnv } from '../../types/hono'

export const programRoutes = new Hono<HonoEnv>()

const programDetail = {
    rewardTiers: true,
    scopeTargets: true,
    triageStages: { orderBy: { order: 'asc' as const } },
    policySections: { orderBy: { order: 'asc' as const } },
    evidenceFields: true,
    reportQueue: { take: 10, orderBy: { submittedAt: 'desc' as const } },
    linkedAgents: { include: { agent: { select: { id: true, name: true, logoMark: true, accentTone: true } } } },
} satisfies Prisma.ProgramInclude

// ── GET /programs ─────────────────────────────────────────────────────────────
programRoutes.get('/', zValidator('query', programQuerySchema), async (c) => {
    const q = c.req.valid('query')

    const where: Prisma.ProgramWhereInput = {
        isPublished: true,
        ...(q.search
            ? {
                OR: [
                    { name: { contains: q.search, mode: 'insensitive' } },
                    { company: { contains: q.search, mode: 'insensitive' } },
                    { tagline: { contains: q.search, mode: 'insensitive' } },
                    { description: { contains: q.search, mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.category ? { categories: { has: q.category } } : {}),
        ...(q.platform ? { platforms: { has: q.platform } } : {}),
        ...(q.language ? { languages: { has: q.language } } : {}),
    }

    const orderBy: Prisma.ProgramOrderByWithRelationInput =
        q.sortBy === 'bounty' ? { maxBountyUsd: 'desc' } :
            q.sortBy === 'name' ? { name: 'asc' } :
                q.sortBy === 'reviews' ? { scopeReviews: 'desc' } :
                    { updatedAt: 'desc' }

    const skip = (q.page - 1) * q.limit

    const [total, programs] = await Promise.all([
        prisma.program.count({ where }),
        prisma.program.findMany({
            where,
            orderBy,
            skip,
            take: q.limit,
            select: {
                id: true, code: true, name: true, company: true, kind: true,
                tagline: true, accentTone: true, logoMark: true, isNew: true,
                maxBountyUsd: true, paidUsd: true, scopeReviews: true,
                categories: true, platforms: true, languages: true,
                triagedLabel: true, startedAt: true, updatedAt: true,
                reputationRequired: true, responseSla: true, payoutCurrency: true,
            },
        }),
    ])

    return paginatedResponse(c, programs, total, q.page, q.limit)
})

// ── GET /programs/:id ─────────────────────────────────────────────────────────
programRoutes.get('/:id', async (c) => {
    const { id } = c.req.param()

    const program = await prisma.program.findUnique({
        where: { id },
        include: programDetail,
    })

    if (!program) return errorResponse(c, 404, 'Program not found')
    return successResponse(c, program)
})

// ── POST /programs (admin or ORGANIZATION) ────────────────────────────────────
programRoutes.post(
    '/',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', createProgramSchema),
    async (c) => {
        const body = c.req.valid('json')
        const user = c.get('user')

        const existing = await prisma.program.findUnique({ where: { id: body.id } })
        if (existing) return errorResponse(c, 409, `Program with id "${body.id}" already exists`)

        const program = await prisma.program.create({
            data: {
                id: body.id,
                code: body.code,
                name: body.name,
                company: body.company,
                kind: body.kind,
                tagline: body.tagline,
                description: body.description,
                accentTone: body.accentTone,
                logoMark: body.logoMark,
                isNew: body.isNew,
                maxBountyUsd: body.maxBountyUsd,
                paidUsd: body.paidUsd,
                scopeReviews: body.scopeReviews,
                startedAt: new Date(body.startedAt),
                reputationRequired: body.reputationRequired,
                pocRequired: body.pocRequired,
                liveMessage: body.liveMessage,
                responseSla: body.responseSla,
                payoutCurrency: body.payoutCurrency,
                payoutWindow: body.payoutWindow,
                duplicatePolicy: body.duplicatePolicy,
                disclosureModel: body.disclosureModel,
                categories: body.categories,
                platforms: body.platforms,
                languages: body.languages,
                summaryHighlights: body.summaryHighlights,
                submissionChecklist: body.submissionChecklist,
                ownerId: user.sub,
                rewardTiers: { create: body.rewardTiers },
                scopeTargets: { create: body.scopeTargets },
                triageStages: { create: body.triageStages },
                policySections: { create: body.policySections },
            },
            include: programDetail,
        })

        return successResponse(c, program, 201)
    }
)

// ── PATCH /programs/:id ───────────────────────────────────────────────────────
programRoutes.patch(
    '/:id',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', updateProgramSchema),
    async (c) => {
        const { id } = c.req.param()
        const body = c.req.valid('json')

        const existing = await prisma.program.findUnique({ where: { id } })
        if (!existing) return errorResponse(c, 404, 'Program not found')

        // Only the owner or admin can update
        const user = c.get('user')
        if (user.role !== 'ADMIN' && existing.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        const { rewardTiers, scopeTargets, triageStages, policySections, ...scalar } = body

        const program = await prisma.program.update({
            where: { id },
            data: {
                ...scalar,
                ...(scalar.startedAt ? { startedAt: new Date(scalar.startedAt) } : {}),
            },
            include: programDetail,
        })

        return successResponse(c, program)
    }
)
