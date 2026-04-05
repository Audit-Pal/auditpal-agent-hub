import { Hono } from 'hono'
import { prisma } from '../../db/client'
import { authMiddleware } from '../../middleware/auth'
import { successResponse } from '../../lib/response'

export const metricsRoutes = new Hono()

// ── GET /metrics ──────────────────────────────────────────────────────────────
metricsRoutes.get('/', authMiddleware, async (c) => {
    const [
        totalPrograms,
        bountyCapacity,
        totalReports,
        reportsByStatus,
        activeAgents,
        topBountyPrograms,
    ] = await Promise.all([
        prisma.program.count({ where: { isPublished: true } }),
        prisma.program.aggregate({ _sum: { maxBountyUsd: true }, where: { isPublished: true } }),
        prisma.report.count(),
        prisma.report.groupBy({ by: ['status'], _count: true }),
        prisma.agent.count({ where: { isActive: true } }),
        prisma.program.findMany({
            where: { isPublished: true },
            orderBy: { maxBountyUsd: 'desc' },
            take: 3,
            select: { id: true, name: true, maxBountyUsd: true, kind: true, accentTone: true, logoMark: true },
        }),
    ])

    return successResponse(c, {
        programs: {
            total: totalPrograms,
            totalBountyCapacityUsd: bountyCapacity._sum.maxBountyUsd ?? 0,
            topBounty: topBountyPrograms,
        },
        reports: {
            total: totalReports,
            byStatus: Object.fromEntries(reportsByStatus.map((r) => [r.status, r._count])),
        },
        agents: {
            active: activeAgents,
        },
    })
})
