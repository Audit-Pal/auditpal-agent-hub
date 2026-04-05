import type { Context, MiddlewareHandler, Next } from 'hono'
import { verifyAccessToken, type TokenPayload } from '../lib/jwt'

export type AuthVariables = {
    user: TokenPayload
}

export const authMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Missing or malformed Authorization header' }, 401)
    }

    const token = authHeader.slice(7)

    try {
        const payload = await verifyAccessToken(token)

        if (payload.type !== 'access') {
            return c.json({ success: false, error: 'Invalid token type' }, 401)
        }

        c.set('user', payload)
        await next()
    } catch {
        return c.json({ success: false, error: 'Invalid or expired access token' }, 401)
    }
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
