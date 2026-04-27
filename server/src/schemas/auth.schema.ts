import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────────────

const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/

const optionalEvmAddressSchema = z.string().trim().refine(
    (value) => value === '' || evmAddressPattern.test(value),
    'Must be a valid 0x-prefixed EVM address',
).optional()

export const registerSchema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    name: z.string().min(2).max(80),
    role: z.enum(['BOUNTY_HUNTER', 'ORGANIZATION']).optional().default('BOUNTY_HUNTER'),
    organizationName: z.string().min(2).max(120).optional(),
    githubHandle: z.string().optional(),
}).superRefine((value, ctx) => {
    if (value.role === 'ORGANIZATION' && !value.organizationName?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['organizationName'],
            message: 'Organization name is required for organization accounts',
        })
    }
})

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
})

export const updateProfileSchema = z.object({
    walletAddress: optionalEvmAddressSchema,
    escrowContractAddress: optionalEvmAddressSchema,
}).superRefine((value, ctx) => {
    if (value.walletAddress === undefined && value.escrowContractAddress === undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'At least one profile field must be provided',
        })
    }
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
