import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const accessSecret = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET ?? 'fallback_access_secret_32_chars!!'
)
const refreshSecret = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET ?? 'fallback_refresh_secret_32_chars!!'
)

export interface TokenPayload extends JWTPayload {
    sub: string        // user id
    email: string
    role: string
    type: 'access' | 'refresh'
}

export async function signAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>) {
    const ttl = process.env.ACCESS_TOKEN_TTL ?? '15m'
    return new SignJWT({ ...payload, type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(accessSecret)
}

export async function signRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>) {
    const ttl = process.env.REFRESH_TOKEN_TTL ?? '7d'
    return new SignJWT({ ...payload, type: 'refresh' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(refreshSecret)
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, accessSecret)
    return payload as TokenPayload
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, refreshSecret)
    return payload as TokenPayload
}

/** Parse the expiry date from a refresh token string ("7d", "30d", etc.) */
export function parseRefreshExpiry(ttl = '7d'): Date {
    const match = ttl.match(/^(\d+)([dhm])$/)
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const [, num, unit] = match
    const ms =
        unit === 'd' ? Number(num) * 86_400_000 :
            unit === 'h' ? Number(num) * 3_600_000 :
                Number(num) * 60_000
    return new Date(Date.now() + ms)
}
