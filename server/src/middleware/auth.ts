import { createHash } from 'crypto'
import type { Context, MiddlewareHandler, Next } from 'hono'
import { prisma } from '../db/client'
import { verifyAccessToken, type TokenPayload } from '../lib/jwt'

export type AuthVariables = {
    user: TokenPayload
}

function unauthorized(c: Context, message: string) {
    return c.json({ success: false, error: message }, 401)
}

async function resolveBearerUser(authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Missing or malformed Authorization header' } as const
    }

    const token = authHeader.slice(7)

    try {
        const payload = await verifyAccessToken(token)

        if (payload.type !== 'access') {
            return { error: 'Invalid token type' } as const
        }

        return { user: payload } as const
    } catch {
        return { error: 'Invalid or expired access token' } as const
    }
}

async function resolveApiKeyUser(apiKey: string): Promise<TokenPayload | null> {
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex')
    const user = await prisma.user.findUnique({
        where: { apiKeyHash },
        select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
        },
    })

    if (!user || !user.isActive) return null

    await prisma.user.update({
        where: { id: user.id },
        data: { apiKeyLastUsedAt: new Date() },
    })

    return {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'api_key',
    }
}

export const authMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
    const resolved = await resolveBearerUser(c.req.header('Authorization'))
    if ('error' in resolved) return unauthorized(c, resolved.error)

    c.set('user', resolved.user)
    await next()
}

export const submissionAuthMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key')?.trim()
    if (apiKey) {
        const user = await resolveApiKeyUser(apiKey)
        if (!user) return unauthorized(c, 'Invalid or inactive API key')

        c.set('user', user)
        await next()
        return
    }

    await authMiddleware(c, next)
}

export const requireRole = (...roles: string[]): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        const user = c.get('user') as TokenPayload | undefined

        if (!user) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        if (!roles.includes(user.role)) {
            return c.json({ success: false, error: 'Forbidden: insufficient role' }, 403)
        }

        await next()
    }
}
