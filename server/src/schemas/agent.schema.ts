import { z } from 'zod'

export const agentQuerySchema = z.object({
    surface: z.enum(['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const registerAgentSchema = z.object({
    name: z.string().min(2).max(50),
    headline: z.string().min(5).max(100),
    summary: z.string().min(10).max(1000),
    capabilities: z.array(z.string()).min(1),
})

export type AgentQuery = z.infer<typeof agentQuerySchema>
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>
