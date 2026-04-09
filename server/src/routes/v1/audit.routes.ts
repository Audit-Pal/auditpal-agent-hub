import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { generateFinding } from '../../services/ai.service'
import { successResponse, errorResponse } from '../../lib/response'
import { authMiddleware } from '../../middleware/auth'
import type { HonoEnv } from '../../types/hono'

export const auditRoutes = new Hono<HonoEnv>()

const generateSchema = z.object({
    code: z.string().optional(),
    description: z.string().optional(),
    context: z.string().optional(),
})

// ── POST /audit/generate ───────────────────────────────────────────────────────
auditRoutes.post('/generate', authMiddleware, zValidator('json', generateSchema), async (c) => {
    const body = c.req.valid('json')

    if (!body.code && !body.description) {
        return errorResponse(c, 400, 'Either code snippet or description is required for AI audit.')
    }

    try {
        const finding = await generateFinding(body)
        return successResponse(c, finding)
    } catch (error) {
        return errorResponse(c, 500, 'AI generation failed. Please try again later.')
    }
})
