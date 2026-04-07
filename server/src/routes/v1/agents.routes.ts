import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import { agentQuerySchema } from '../../schemas/agent.schema'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import type { HonoEnv } from '../../types/hono'

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
                id: true, name: true, accentTone: true, logoMark: true, rank: true,
                score: true, minerName: true, headline: true, supportedSurfaces: true,
                capabilities: true, isActive: true,
            },
        }),
    ])

    return paginatedResponse(c, agents, total, q.page, q.limit)
})

// ── GET /agents/:id ───────────────────────────────────────────────────────────
agentRoutes.get('/:id', async (c) => {
    const { id } = c.req.param()

    const agent = await prisma.agent.findUnique({
        where: { id },
        include: agentDetail,
    })

    if (!agent) return errorResponse(c, 404, 'Agent not found')
    return successResponse(c, agent)
})
