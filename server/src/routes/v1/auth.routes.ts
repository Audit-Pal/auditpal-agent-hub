import { createHash, randomBytes } from 'crypto'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import { registerSchema, loginSchema, refreshSchema, updateProfileSchema } from '../../schemas/auth.schema'
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    parseRefreshExpiry,
} from '../../lib/jwt'
import { errorResponse, successResponse } from '../../lib/response'
import { authMiddleware, requireRole } from '../../middleware/auth'

import type { HonoEnv } from '../../types/hono'

export const authRoutes = new Hono<HonoEnv>()

const userProfileSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    reputation: true,
    bio: true,
    avatarUrl: true,
    githubHandle: true,
    organizationName: true,
    walletAddress: true,
    escrowContractAddress: true,
    createdAt: true,
    apiKeyPreview: true,
    apiKeyCreatedAt: true,
    apiKeyLastUsedAt: true,
} as const

function serializeUserProfile(user: {
    id: string
    email: string
    name: string
    role: string
    reputation: number
    bio?: string | null
    avatarUrl?: string | null
    githubHandle?: string | null
    organizationName?: string | null
    walletAddress?: string | null
    escrowContractAddress?: string | null
    createdAt?: Date
    apiKeyPreview?: string | null
    apiKeyCreatedAt?: Date | null
    apiKeyLastUsedAt?: Date | null
}) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        reputation: user.reputation,
        bio: user.bio ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        githubHandle: user.githubHandle ?? undefined,
        organizationName: user.organizationName ?? undefined,
        walletAddress: user.walletAddress ?? undefined,
        escrowContractAddress: user.escrowContractAddress ?? undefined,
        createdAt: user.createdAt,
        hasApiKey: Boolean(user.apiKeyPreview),
        apiKeyPreview: user.apiKeyPreview ?? undefined,
        apiKeyCreatedAt: user.apiKeyCreatedAt ?? undefined,
        apiKeyLastUsedAt: user.apiKeyLastUsedAt ?? undefined,
    }
}

function generatePlatformApiKey() {
    return 'auditpal_live_' + randomBytes(24).toString('base64url')
}

function hashPlatformApiKey(apiKey: string) {
    return createHash('sha256').update(apiKey).digest('hex')
}

function buildApiKeyPreview(apiKey: string) {
    return apiKey.slice(0, 18) + '...' + apiKey.slice(-4)
}

// ── POST /register ───────────────────────────────────────────────────────────
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
    const body = c.req.valid('json')

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) return errorResponse(c, 409, 'Email already in use')

    const passwordHash = await Bun.password.hash(body.password)

    const user = await prisma.user.create({
        data: {
            email: body.email,
            passwordHash,
            name: body.name,
            role: body.role,
            organizationName: body.role === 'ORGANIZATION' ? body.organizationName : null,
            githubHandle: body.githubHandle,
        },
        select: userProfileSelect,
    })

    const tokenPayload = { sub: user.id, email: user.email, role: user.role }
    const [accessToken, refreshTokenStr] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
    ])

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenStr,
            userId: user.id,
            expiresAt: parseRefreshExpiry(process.env.REFRESH_TOKEN_TTL),
        },
    })

    return successResponse(c, {
        user: serializeUserProfile(user),
        accessToken,
        refreshToken: refreshTokenStr,
    }, 201)
})

// ── POST /login ───────────────────────────────────────────────────────────────
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user || !user.isActive) return errorResponse(c, 401, 'Invalid credentials')

    const valid = await Bun.password.verify(body.password, user.passwordHash)
    if (!valid) return errorResponse(c, 401, 'Invalid credentials')

    const tokenPayload = { sub: user.id, email: user.email, role: user.role }
    const [accessToken, refreshTokenStr] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
    ])

    await prisma.refreshToken.create({
        data: {
            token: refreshTokenStr,
            userId: user.id,
            expiresAt: parseRefreshExpiry(process.env.REFRESH_TOKEN_TTL),
        },
    })

    return successResponse(c, {
        user: serializeUserProfile(user),
        accessToken,
        refreshToken: refreshTokenStr,
    })
})

// ── POST /refresh ─────────────────────────────────────────────────────────────
authRoutes.post('/refresh', zValidator('json', refreshSchema), async (c) => {
    const { refreshToken } = c.req.valid('json')

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        return errorResponse(c, 401, 'Refresh token is invalid or expired')
    }

    let payload: Awaited<ReturnType<typeof verifyRefreshToken>>
    try {
        payload = await verifyRefreshToken(refreshToken)
    } catch {
        return errorResponse(c, 401, 'Refresh token signature invalid')
    }

    const [, newAccess, newRefreshStr] = await Promise.all([
        prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        }),
        signAccessToken({ sub: payload.sub!, email: payload.email, role: payload.role }),
        signRefreshToken({ sub: payload.sub!, email: payload.email, role: payload.role }),
    ])

    await prisma.refreshToken.create({
        data: {
            token: newRefreshStr,
            userId: stored.userId,
            expiresAt: parseRefreshExpiry(process.env.REFRESH_TOKEN_TTL),
        },
    })

    return successResponse(c, { accessToken: newAccess, refreshToken: newRefreshStr })
})

// ── POST /logout ──────────────────────────────────────────────────────────────
authRoutes.post('/logout', zValidator('json', refreshSchema), async (c) => {
    const { refreshToken } = c.req.valid('json')
    await prisma.refreshToken.updateMany({
        where: { token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
    })
    return successResponse(c, { message: 'Logged out successfully' })
})

// ── GET /me ───────────────────────────────────────────────────────────────────
authRoutes.get('/me', authMiddleware, async (c) => {
    const { sub } = c.get('user')
    const user = await prisma.user.findUnique({
        where: { id: sub },
        select: userProfileSelect,
    })
    if (!user) return errorResponse(c, 404, 'User not found')
    return successResponse(c, serializeUserProfile(user))
})

// ── PATCH /me ────────────────────────────────────────────────────────────────
authRoutes.patch('/me', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
    const { sub, role } = c.get('user')
    const body = c.req.valid('json')

    if (body.escrowContractAddress !== undefined && role !== 'ORGANIZATION') {
        return errorResponse(c, 403, 'Only organization accounts can store an escrow contract address')
    }

    const user = await prisma.user.update({
        where: { id: sub },
        data: {
            ...(body.walletAddress !== undefined
                ? { walletAddress: body.walletAddress.trim() || null }
                : {}),
            ...(body.escrowContractAddress !== undefined
                ? { escrowContractAddress: body.escrowContractAddress.trim() || null }
                : {}),
        },
        select: userProfileSelect,
    })

    return successResponse(c, serializeUserProfile(user))
})

// ── POST /api-key ─────────────────────────────────────────────────────────────
authRoutes.post('/api-key', authMiddleware, requireRole('BOUNTY_HUNTER', 'ADMIN'), async (c) => {
    const { sub } = c.get('user')
    const apiKey = generatePlatformApiKey()
    const createdAt = new Date()

    const user = await prisma.user.update({
        where: { id: sub },
        data: {
            apiKeyHash: hashPlatformApiKey(apiKey),
            apiKeyPreview: buildApiKeyPreview(apiKey),
            apiKeyCreatedAt: createdAt,
            apiKeyLastUsedAt: null,
        },
        select: userProfileSelect,
    })

    return successResponse(c, {
        apiKey,
        user: serializeUserProfile(user),
    })
})
