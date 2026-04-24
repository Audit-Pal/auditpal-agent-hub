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

export const updateAgentSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    headline: z.string().min(5).max(100).optional(),
    summary: z.string().min(10).max(1000).optional(),
    capabilities: z.array(z.string()).optional(),
    guardrails: z.array(z.string()).optional(),
    accentTone: z.enum(['mint', 'violet', 'orange', 'ink', 'blue', 'rose']).optional(),
    supportedSurfaces: z.array(z.enum(['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN'])).optional(),
    supportedTechnologies: z.array(z.string()).optional(),
    tools: z.array(z.object({
        name: z.string(),
        access: z.string().optional(),
        useCase: z.string(),
    })).optional(),
    runtimeFlow: z.array(z.object({
        order: z.number().int(),
        title: z.string(),
        description: z.string(),
        outputs: z.array(z.string()).optional(),
        humanGate: z.string().optional(),
    })).optional(),
})

export type AgentQuery = z.infer<typeof agentQuerySchema>
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
