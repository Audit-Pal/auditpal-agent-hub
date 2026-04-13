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
    linkedAgents: { include: { agent: { select: { id: true, name: true, logoMark: true, accentTone: true, headline: true, recentExecutions: { orderBy: { timestamp: 'desc' as const }, take: 5 } } } } },
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
                description: true,
                tagline: true, accentTone: true, logoMark: true, isNew: true,
                maxBountyUsd: true, paidUsd: true, scopeReviews: true,
                categories: true, platforms: true, languages: true,
                triagedLabel: true, startedAt: true, updatedAt: true,
                reputationRequired: true, pocRequired: true, liveMessage: true,
                responseSla: true, payoutCurrency: true, payoutWindow: true,
                duplicatePolicy: true, disclosureModel: true,
                summaryHighlights: true, submissionChecklist: true,
                scopeTargets: true,
            },
        }),
    ])

    return paginatedResponse(c, programs, total, q.page, q.limit)
})

// ── GET /programs/mine (protected) ──────────────────────────────────────────
programRoutes.get('/mine', authMiddleware, requireRole('ORGANIZATION', 'ADMIN'), async (c) => {
    const user = c.get('user')
    const skip = 0
    const limit = 100

    const [total, programs] = await Promise.all([
        prisma.program.count({ where: { ownerId: user.sub } }),
        prisma.program.findMany({
            where: { ownerId: user.sub },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, code: true, name: true, company: true, kind: true,
                description: true,
                tagline: true, accentTone: true, logoMark: true, isNew: true,
                maxBountyUsd: true, paidUsd: true, scopeReviews: true,
                categories: true, platforms: true, languages: true,
                triagedLabel: true, startedAt: true, updatedAt: true,
                reputationRequired: true, pocRequired: true, liveMessage: true,
                responseSla: true, payoutCurrency: true, payoutWindow: true,
                duplicatePolicy: true, disclosureModel: true,
                summaryHighlights: true, submissionChecklist: true,
                scopeTargets: true,
                status: true,
                isPublished: true,
            },
        }),
    ])

    return successResponse(c, programs)
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

        const {
            gatekeeperEmail, gatekeeperPassword, validatorEmail, validatorPassword,
            rewardTiers, scopeTargets, triageStages, policySections,
            ...programData
        } = body

        // Helper to get-or-create checker users
        async function getOrCreateChecker(email?: string, password?: string, role?: 'GATEKEEPER' | 'VALIDATOR') {
            if (!email || !password || !role) return null
            
            let user = await prisma.user.findUnique({ where: { email } })
            if (user) {
                // Ensure they have the correct role if already existing
                if (user.role !== role) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { role },
                    })
                }
                return user.id
            }

            const passwordHash = await Bun.password.hash(password)
            const newUser = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    name: role === 'GATEKEEPER' ? 'Junior Checker' : 'Senior Validator',
                    role,
                    organizationName: body.company,
                }
            })
            return newUser.id
        }

        const gatekeeperId = await getOrCreateChecker(gatekeeperEmail, gatekeeperPassword, 'GATEKEEPER')
        const validatorId = await getOrCreateChecker(validatorEmail, validatorPassword, 'VALIDATOR')

        const program = await prisma.program.create({
            data: {
                ...programData,
                startedAt: new Date(programData.startedAt),
                ownerId: user.sub,
                gatekeeperId,
                validatorId,
                rewardTiers: { create: rewardTiers },
                scopeTargets: { create: scopeTargets },
                triageStages: { create: triageStages },
                policySections: { create: policySections },
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
                ...(rewardTiers ? { rewardTiers: { deleteMany: {}, create: rewardTiers } } : {}),
                ...(scopeTargets ? { scopeTargets: { deleteMany: {}, create: scopeTargets } } : {}),
                ...(triageStages ? { triageStages: { deleteMany: {}, create: triageStages } } : {}),
                ...(policySections ? { policySections: { deleteMany: {}, create: policySections } } : {}),
            },
            include: programDetail,
        })

        return successResponse(c, program)
    }
)

// ── DELETE /programs/:id ──────────────────────────────────────────────────────
programRoutes.delete(
    '/:id',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    async (c) => {
        const { id } = c.req.param()
        const user = c.get('user')

        const existing = await prisma.program.findUnique({ where: { id } })
        if (!existing) return errorResponse(c, 404, 'Program not found')

        if (user.role !== 'ADMIN' && existing.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        await prisma.program.delete({ where: { id } })
        return successResponse(c, { deleted: true })
    }
)

// ── POST /programs/:id/fund ──────────────────────────────────────────────────
programRoutes.post(
    '/:id/fund',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    async (c) => {
        const { id } = c.req.param()
        const user = c.get('user')

        const program = await prisma.program.findUnique({ where: { id } })
        if (!program) return errorResponse(c, 404, 'Program not found')

        if (user.role !== 'ADMIN' && program.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        if (program.status !== 'AWAITING_FUNDS' && program.status !== 'DRAFT') {
            return errorResponse(c, 400, `Cannot fund program in status ${program.status}`)
        }

        const body = await c.req.json().catch(() => ({}))
        const fundAmount = typeof body.amount === 'number' ? body.amount : 0

        const updated = await (prisma.program as any).update({
            where: { id },
            data: {
                status: 'ACTIVE',
                isPublished: true,
                paidUsd: fundAmount,
                startedAt: new Date(),
                publishedAt: new Date(),
            },
        })

        return successResponse(c, updated)
    }
)
