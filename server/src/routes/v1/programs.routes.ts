import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import {
    createProgramSchema,
    updateProgramSchema,
    programQuerySchema,
} from '../../schemas/program.schema'
import { authMiddleware, requireRole } from '../../middleware/auth'
import { errorResponse, successResponse, paginatedResponse } from '../../lib/response'
import { CHAIN_CONFIG, publicClient, REWARD_ESCROW_ABI, REWARD_FACTORY_ABI } from '../../services/blockchain.service'
import { Prisma } from '@prisma/client'
import type { Address, Hex } from 'viem'
import type { HonoEnv } from '../../types/hono'

export const programRoutes = new Hono<HonoEnv>()

const programDetail = {
    rewardTiers: true,
    scopeTargets: true,
    triageStages: { orderBy: { order: 'asc' as const } },
    policySections: { orderBy: { order: 'asc' as const } },
    evidenceFields: true,
    reports: { take: 10, orderBy: { submittedAt: 'desc' as const } },
    linkedAgents: { include: { agent: { select: { id: true, name: true, logoMark: true, accentTone: true, headline: true, recentExecutions: { orderBy: { timestamp: 'desc' as const }, take: 5 } } } } },
} satisfies Prisma.ProgramInclude

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address')
const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
const zeroTxHash = `0x${'0'.repeat(64)}`

const registerProgramEscrowSchema = z.object({
    escrowAddress: evmAddressSchema,
    tokenAddress: evmAddressSchema,
    deployTxHash: txHashSchema.optional(),
    approvalTxHash: txHashSchema.optional(),
    fundingTxHash: txHashSchema,
    chainId: z.number().int().positive().optional(),
})

const fundProgramSchema = z.object({
    amount: z.number().positive(),
    escrowAddress: evmAddressSchema.optional(),
    approvalTxHash: txHashSchema.optional(),
    fundingTxHash: txHashSchema.optional(),
}).superRefine((value, ctx) => {
    if (value.escrowAddress && !value.fundingTxHash) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fundingTxHash'],
            message: 'Funding transaction hash is required when activating with an escrow',
        })
    }
})

async function getTransactionValidationError(hash: string, expectedTo: string, label: string) {
    try {
        const [transaction, receipt] = await Promise.all([
            publicClient.getTransaction({ hash: hash as Hex }),
            publicClient.getTransactionReceipt({ hash: hash as Hex }),
        ])

        if (receipt.status !== 'success') {
            return `${label} transaction did not succeed`
        }

        if (expectedTo && transaction.to?.toLowerCase() !== expectedTo.toLowerCase()) {
            return `${label} transaction was not sent to the expected contract`
        }

        return null
    } catch {
        return `Unable to verify ${label} transaction`
    }
}

// ── GET /programs ─────────────────────────────────────────────────────────────
programRoutes.get('/', zValidator('query', programQuerySchema), async (c) => {
    const q = c.req.valid('query')

    const where: Prisma.ProgramWhereInput = {
        isPublished: true,
        ...(q.search
            ? {
                OR: [
                    { name: { contains: q.search, mode: 'insensitive' } },
                    { company: { contains: q.search, mode: 'insensitive' } },
                    { tagline: { contains: q.search, mode: 'insensitive' } },
                    { description: { contains: q.search, mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.category ? { categories: { has: q.category } } : {}),
        ...(q.platform ? { platforms: { has: q.platform } } : {}),
        ...(q.language ? { languages: { has: q.language } } : {}),
    }

    const orderBy: Prisma.ProgramOrderByWithRelationInput =
        q.sortBy === 'bounty' ? { maxBountyUsd: 'desc' } :
            q.sortBy === 'name' ? { name: 'asc' } :
                q.sortBy === 'reviews' ? { scopeReviews: 'desc' } :
                    { updatedAt: 'desc' }

    const skip = (q.page - 1) * q.limit

    const [total, programs] = await Promise.all([
        prisma.program.count({ where }),
        prisma.program.findMany({
            where,
            orderBy,
            skip,
            take: q.limit,
            select: {
                id: true, code: true, name: true, company: true, kind: true,
                description: true,
                tagline: true, accentTone: true, logoMark: true, isNew: true,
                maxBountyUsd: true, paidUsd: true, scopeReviews: true,
                categories: true, platforms: true, languages: true,
                triagedLabel: true, startedAt: true, updatedAt: true,
                reputationRequired: true, pocRequired: true, liveMessage: true,
                responseSla: true, payoutCurrency: true, payoutWindow: true,
                duplicatePolicy: true, disclosureModel: true,
                summaryHighlights: true, submissionChecklist: true,
                scopeTargets: true,
                _count: {
                    select: { reports: true }
                }
            },
        }),
    ])

    return paginatedResponse(c, programs, total, q.page, q.limit)
})

// ── GET /programs/mine (protected) ──────────────────────────────────────────
programRoutes.get('/mine', authMiddleware, requireRole('ORGANIZATION', 'ADMIN'), async (c) => {
    const user = c.get('user')
    const skip = 0
    const limit = 100

    const [total, programs] = await Promise.all([
        prisma.program.count({ where: { ownerId: user.sub } }),
        prisma.program.findMany({
            where: { ownerId: user.sub },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, code: true, name: true, company: true, kind: true,
                description: true,
                tagline: true, accentTone: true, logoMark: true, isNew: true,
                maxBountyUsd: true, paidUsd: true, scopeReviews: true,
                categories: true, platforms: true, languages: true,
                triagedLabel: true, startedAt: true, updatedAt: true,
                reputationRequired: true, pocRequired: true, liveMessage: true,
                responseSla: true, payoutCurrency: true, payoutWindow: true,
                duplicatePolicy: true, disclosureModel: true,
                summaryHighlights: true, submissionChecklist: true,
                scopeTargets: true,
                status: true,
                isPublished: true,
                publishedAt: true,
                _count: {
                    select: { reports: true }
                }
            },
        }),
    ])

    return successResponse(c, programs)
})

// ── GET /programs/:id ─────────────────────────────────────────────────────────
programRoutes.get('/:id', async (c) => {
    const { id } = c.req.param()

    const program = await prisma.program.findUnique({
        where: { id },
        include: programDetail,
    })

    if (!program) return errorResponse(c, 404, 'Program not found')
    return successResponse(c, program)
})

// ── POST /programs (admin or ORGANIZATION) ────────────────────────────────────
programRoutes.post(
    '/',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', createProgramSchema),
    async (c) => {
        const body = c.req.valid('json')
        const user = c.get('user')

        const existing = await prisma.program.findUnique({ where: { id: body.id } })
        if (existing) return errorResponse(c, 409, `Program with id "${body.id}" already exists`)

        const {
            gatekeeperEmail, gatekeeperPassword, validatorEmail, validatorPassword,
            rewardTiers, scopeTargets, triageStages, policySections,
            ...programData
        } = body

        // Helper to get-or-create checker users
        async function getOrCreateChecker(email?: string, password?: string, role?: 'GATEKEEPER' | 'VALIDATOR') {
            if (!email || !password || !role) return null
            
            let user = await prisma.user.findUnique({ where: { email } })
            if (user) {
                // Ensure they have the correct role if already existing
                if (user.role !== role) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { role },
                    })
                }
                return user.id
            }

            const passwordHash = await Bun.password.hash(password)
            const newUser = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    name: role === 'GATEKEEPER' ? 'Junior Checker' : 'Senior Validator',
                    role,
                    organizationName: body.company,
                }
            })
            return newUser.id
        }

        const gatekeeperId = await getOrCreateChecker(gatekeeperEmail, gatekeeperPassword, 'GATEKEEPER')
        const validatorId = await getOrCreateChecker(validatorEmail, validatorPassword, 'VALIDATOR')

        const program = await prisma.program.create({
            data: {
                ...programData,
                startedAt: new Date(programData.startedAt),
                ownerId: user.sub,
                gatekeeperId,
                validatorId,
                rewardTiers: { create: rewardTiers },
                scopeTargets: { create: scopeTargets },
                triageStages: { create: triageStages },
                policySections: { create: policySections },
            },
            include: programDetail,
        })

        return successResponse(c, program, 201)
    }
)

// ── PATCH /programs/:id ───────────────────────────────────────────────────────
programRoutes.patch(
    '/:id',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    zValidator('json', updateProgramSchema),
    async (c) => {
        const { id } = c.req.param()
        const body = c.req.valid('json')

        const existing = await prisma.program.findUnique({ where: { id } })
        if (!existing) return errorResponse(c, 404, 'Program not found')

        // Only the owner or admin can update
        const user = c.get('user')
        if (user.role !== 'ADMIN' && existing.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        const { rewardTiers, scopeTargets, triageStages, policySections, ...scalar } = body

        const program = await prisma.program.update({
            where: { id },
            data: {
                ...scalar,
                ...(scalar.startedAt ? { startedAt: new Date(scalar.startedAt) } : {}),
                ...(rewardTiers ? { rewardTiers: { deleteMany: {}, create: rewardTiers } } : {}),
                ...(scopeTargets ? { scopeTargets: { deleteMany: {}, create: scopeTargets } } : {}),
                ...(triageStages ? { triageStages: { deleteMany: {}, create: triageStages } } : {}),
                ...(policySections ? { policySections: { deleteMany: {}, create: policySections } } : {}),
            },
            include: programDetail,
        })

        return successResponse(c, program)
    }
)

// ── DELETE /programs/:id ──────────────────────────────────────────────────────
programRoutes.delete(
    '/:id',
    authMiddleware,
    requireRole('ADMIN', 'ORGANIZATION'),
    async (c) => {
        const { id } = c.req.param()
        const user = c.get('user')

        const existing = await prisma.program.findUnique({ where: { id } })
        if (!existing) return errorResponse(c, 404, 'Program not found')

        if (user.role !== 'ADMIN' && existing.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        await prisma.$transaction(async (tx) => {
            // 1. Find all reports associated with this program
            const reports = await tx.report.findMany({
                where: { programId: id },
                select: { id: true },
            })
            const reportIds = reports.map((r) => r.id)

            if (reportIds.length > 0) {
                // 2. Delete all reward deposits for these reports
                await tx.rewardDeposit.deleteMany({
                    where: { reportId: { in: reportIds } },
                })

                // 3. Delete all vulnerabilities for these reports
                await tx.vulnerability.deleteMany({
                    where: { reportId: { in: reportIds } },
                })

                // 4. Delete all reports
                await tx.report.deleteMany({
                    where: { id: { in: reportIds } },
                })
            }

            // 5. Delete the program itself (this will cascade delete rewardTiers, scopeTargets, triageStages, policySections, evidenceFields, linkedAgents)
            await tx.program.delete({ where: { id } })
        })

        return successResponse(c, { deleted: true })
    }
)

// ── POST /programs/:id/register-escrow ───────────────────────────────────────
programRoutes.post(
    '/:id/register-escrow',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', registerProgramEscrowSchema),
    async (c) => {
        const { id } = c.req.param()
        const user = c.get('user')
        const body = c.req.valid('json')

        const program = await prisma.program.findUnique({
            where: { id },
            select: { id: true, ownerId: true },
        })
        if (!program) return errorResponse(c, 404, 'Program not found')

        if (user.role !== 'ADMIN' && program.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        const orgUser = await prisma.user.findUnique({
            where: { id: user.sub },
            select: { walletAddress: true },
        })
        if (!orgUser?.walletAddress) {
            return errorResponse(c, 400, 'Organisation must connect a wallet first')
        }

        const expectedFactoryAddress = CHAIN_CONFIG.factoryAddress
        if (!expectedFactoryAddress) {
            return errorResponse(c, 500, 'Reward factory address is not configured')
        }

        let escrowAdmin: unknown
        let escrowToken: unknown
        let escrowFactory: unknown
        let factoryEscrow: unknown

        try {
            [escrowAdmin, escrowToken, escrowFactory, factoryEscrow] = await Promise.all([
                publicClient.readContract({
                    address: body.escrowAddress as Address,
                    abi: REWARD_ESCROW_ABI,
                    functionName: 'admin',
                } as any),
                publicClient.readContract({
                    address: body.escrowAddress as Address,
                    abi: REWARD_ESCROW_ABI,
                    functionName: 'token',
                } as any),
                publicClient.readContract({
                    address: body.escrowAddress as Address,
                    abi: REWARD_ESCROW_ABI,
                    functionName: 'factory',
                } as any),
                publicClient.readContract({
                    address: expectedFactoryAddress,
                    abi: REWARD_FACTORY_ABI,
                    functionName: 'escrows',
                    args: [orgUser.walletAddress as Address],
                } as any),
                publicClient.readContract({
                    address: body.escrowAddress as Address,
                    abi: REWARD_ESCROW_ABI,
                    functionName: 'totalAllocated',
                } as any),
            ])
        } catch {
            return errorResponse(c, 400, 'Escrow does not match the current RewardEscrow funding contract')
        }

        if (String(escrowAdmin).toLowerCase() !== orgUser.walletAddress.toLowerCase()) {
            return errorResponse(c, 400, 'Connected wallet is not the admin of this escrow')
        }

        if (String(escrowToken).toLowerCase() !== body.tokenAddress.toLowerCase()) {
            return errorResponse(c, 400, 'Escrow token does not match the selected payout token')
        }

        if (String(escrowFactory).toLowerCase() !== expectedFactoryAddress.toLowerCase()) {
            return errorResponse(c, 400, 'Escrow was not deployed by the configured reward factory')
        }

        if (String(factoryEscrow).toLowerCase() !== body.escrowAddress.toLowerCase()) {
            return errorResponse(c, 400, 'Configured reward factory does not map this wallet to the submitted escrow')
        }

        if (body.deployTxHash && body.deployTxHash !== zeroTxHash) {
            const deployError = await getTransactionValidationError(body.deployTxHash, expectedFactoryAddress, 'Deployment')
            if (deployError) return errorResponse(c, 400, deployError)
        }

        if (body.approvalTxHash) {
            const approvalError = await getTransactionValidationError(body.approvalTxHash, body.tokenAddress, 'Approval')
            if (approvalError) return errorResponse(c, 400, approvalError)
        }

        const fundingError = await getTransactionValidationError(body.fundingTxHash, body.escrowAddress, 'Funding')
        if (fundingError) return errorResponse(c, 400, fundingError)

        const existingByAddress = await prisma.rewardEscrow.findUnique({
            where: { escrowAddress: body.escrowAddress },
        })
        if (existingByAddress && existingByAddress.organizationId !== user.sub) {
            return errorResponse(c, 409, 'Escrow contract is already linked to another organisation')
        }

        const deployTxHash = body.deployTxHash && body.deployTxHash !== zeroTxHash
            ? body.deployTxHash
            : existingByAddress?.deployTxHash ?? zeroTxHash

        const escrow = await prisma.rewardEscrow.upsert({
            where: { organizationId: user.sub },
            update: {
                escrowAddress: body.escrowAddress,
                tokenAddress: body.tokenAddress,
                chainId: body.chainId ?? CHAIN_CONFIG.chainId,
                deployTxHash,
            },
            create: {
                organizationId: user.sub,
                escrowAddress: body.escrowAddress,
                tokenAddress: body.tokenAddress,
                chainId: body.chainId ?? CHAIN_CONFIG.chainId,
                deployTxHash,
            },
        })

        await prisma.user.update({
            where: { id: user.sub },
            data: { escrowContractAddress: body.escrowAddress },
        })

        return successResponse(c, {
            programId: id,
            escrowAddress: escrow.escrowAddress,
            tokenAddress: escrow.tokenAddress,
            chainId: escrow.chainId,
            approvalTxHash: body.approvalTxHash,
            fundingTxHash: body.fundingTxHash,
            blockExplorer: `${CHAIN_CONFIG.blockExplorer}/address/${escrow.escrowAddress}`,
        }, existingByAddress ? 200 : 201)
    }
)

// ── POST /programs/:id/fund ──────────────────────────────────────────────────
programRoutes.post(
    '/:id/fund',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', fundProgramSchema),
    async (c) => {
        const { id } = c.req.param()
        const user = c.get('user')
        const body = c.req.valid('json')

        const program = await prisma.program.findUnique({ where: { id } })
        if (!program) return errorResponse(c, 404, 'Program not found')

        if (user.role !== 'ADMIN' && program.ownerId !== user.sub) {
            return errorResponse(c, 403, 'You do not own this program')
        }

        if (program.status !== 'AWAITING_FUNDS' && program.status !== 'DRAFT') {
            return errorResponse(c, 400, `Cannot fund program in status ${program.status}`)
        }

        if (body.escrowAddress) {
            const escrow = await prisma.rewardEscrow.findUnique({
                where: { organizationId: user.sub },
            })
            if (!escrow || escrow.escrowAddress.toLowerCase() !== body.escrowAddress.toLowerCase()) {
                return errorResponse(c, 400, 'Escrow contract is not linked to this organisation')
            }

            if (body.approvalTxHash) {
                const approvalError = await getTransactionValidationError(body.approvalTxHash, escrow.tokenAddress, 'Approval')
                if (approvalError) return errorResponse(c, 400, approvalError)
            }

            if (body.fundingTxHash) {
                const fundingError = await getTransactionValidationError(body.fundingTxHash, body.escrowAddress, 'Funding')
                if (fundingError) return errorResponse(c, 400, fundingError)
            }
        }

        const updated = await (prisma.program as any).update({
            where: { id },
            data: {
                status: 'ACTIVE',
                isPublished: true,
                paidUsd: Math.round(body.amount),
                startedAt: new Date(),
                publishedAt: new Date(),
            },
        })

        return successResponse(c, updated)
    }
)
