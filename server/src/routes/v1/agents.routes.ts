import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import { agentQuerySchema, registerAgentSchema } from '../../schemas/agent.schema'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import type { HonoEnv } from '../../types/hono'
import { authMiddleware, requireRole } from '../../middleware/auth'

export const agentRoutes = new Hono<HonoEnv>()

const agentDetail = {
    metrics: true,
    tools: true,
    runtimeFlow: { orderBy: { order: 'asc' as const } },
    outputSchema: true,
    recentExecutions: { orderBy: { timestamp: 'desc' as const }, take: 5 },
    linkedPrograms: {
        include: { program: { select: { id: true, code: true, name: true, logoMark: true, accentTone: true } } },
    },
}

// ── GET /agents ───────────────────────────────────────────────────────────────
agentRoutes.get('/', zValidator('query', agentQuerySchema), async (c) => {
    const q = c.req.valid('query')

    const where = {
        isActive: true,
        ...(q.surface ? { supportedSurfaces: { has: q.surface } } : {}),
    }

    const skip = (q.page - 1) * q.limit

    const [total, agents] = await Promise.all([
        prisma.agent.count({ where }),
        prisma.agent.findMany({
            where,
            skip,
            take: q.limit,
            orderBy: [{ rank: 'asc' }, { name: 'asc' }],
            select: {
                id: true, slug: true, name: true, accentTone: true, logoMark: true, rank: true,
                score: true, minerName: true, headline: true, supportedSurfaces: true,
                capabilities: true, isActive: true, ownerId: true,
            },
        }),
    ])

    return paginatedResponse(c, agents, total, q.page, q.limit)
})

// ── GET /agents/mine ─────────────────────────────────────────────────────────
agentRoutes.get('/mine', authMiddleware, async (c) => {
    const { sub } = c.get('user')
    const agents = await prisma.agent.findMany({
        where: { ownerId: sub },
        select: {
            id: true, slug: true, name: true, headline: true, logoMark: true, accentTone: true,
            capabilities: true,
        },
    })
    return successResponse(c, agents)
})

// ── POST /agents ──────────────────────────────────────────────────────────────
agentRoutes.post('/', authMiddleware, requireRole('BOUNTY_HUNTER', 'ADMIN'), zValidator('json', registerAgentSchema), async (c) => {
    const { sub } = c.get('user')
    const body = c.req.valid('json')
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    const agent = await prisma.agent.create({
        data: {
            id: `agent-${Math.random().toString(36).substring(2, 10)}`,
            slug,
            name: body.name,
            headline: body.headline,
            summary: body.summary,
            capabilities: body.capabilities,
            ownerId: sub,
            logoMark: body.name.substring(0, 1).toUpperCase(),
            accentTone: 'mint',
            isActive: true,
        },
    })

    return successResponse(c, agent, 201)
})

// ── GET /agents/:id ───────────────────────────────────────────────────────────
agentRoutes.get('/:id', async (c) => {
    const { id } = c.req.param()

    const agent = await prisma.agent.findUnique({
        where: id.startsWith('agent-') ? { id } : { slug: id },
        include: agentDetail,
    })

    if (!agent) return errorResponse(c, 404, 'Agent not found')
    return successResponse(c, agent)
})
