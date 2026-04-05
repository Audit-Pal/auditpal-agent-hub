import { z } from 'zod'

export const agentQuerySchema = z.object({
    surface: z.enum(['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type AgentQuery = z.infer<typeof agentQuerySchema>
