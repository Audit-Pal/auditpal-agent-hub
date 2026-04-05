import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    name: z.string().min(2).max(80),
    role: z.enum(['BOUNTY_HUNTER', 'ORGANIZATION']).default('BOUNTY_HUNTER'),
    organizationName: z.string().min(2).max(120).optional(),
    githubHandle: z.string().optional(),
})

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
