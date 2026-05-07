import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { prisma } from '../../db/client'
import { authMiddleware, requireRole } from '../../middleware/auth'
import { errorResponse, successResponse } from '../../lib/response'
import type { HonoEnv } from '../../types/hono'
import {
    deployEscrow,
    getEscrowAddress,
    getRewardOnChain,
    buildClaimTypedData,
    reportIdToBytes32,
    CHAIN_CONFIG,
    publicClient,
    REWARD_ESCROW_ABI,
    verifySubmissionSignature,
} from '../../services/blockchain.service'
import type { Address, Hex } from 'viem'

export const rewardsRoutes = new Hono<HonoEnv>()

// ── Schemas ───────────────────────────────────────────────────────────────────

const deployEscrowSchema = z.object({
    tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
})

const depositRewardSchema = z.object({
    reportId: z.string().min(1),
    payeeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payee address'),
    amountUsdc: z.number().positive(), // in USDC (e.g. 500 = 500 USDC)
})

const claimRewardSchema = z.object({
    reportId: z.string().min(1),
})

// ── GET /rewards/chain-config ────────────────────────────────────────────────
// Public — returns chain/contract info for frontend
rewardsRoutes.get('/chain-config', (c) => {
    return successResponse(c, CHAIN_CONFIG)
})

// ── POST /rewards/deploy-escrow ──────────────────────────────────────────────
// Organisation deploys their escrow contract
rewardsRoutes.post(
    '/deploy-escrow',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', deployEscrowSchema),
    async (c) => {
        const user = c.get('user')
        const { tokenAddress } = c.req.valid('json')

        try {
            // Check if org already has an escrow
            const existing = await prisma.rewardEscrow.findUnique({
                where: { organizationId: user.sub },
            })
            if (existing) {
                return errorResponse(c, 409, 'Escrow already deployed', {
                    escrowAddress: existing.escrowAddress,
                })
            }

            // Get org wallet address
            const orgUser = await prisma.user.findUnique({
                where: { id: user.sub },
                select: { walletAddress: true },
            })
            if (!orgUser?.walletAddress) {
                return errorResponse(c, 400, 'Organisation must set a wallet address first')
            }

            // Deploy on-chain
            const { hash, escrowAddress } = await deployEscrow(
                orgUser.walletAddress as Address,
                tokenAddress as Address
            )

            // Save to DB
            const escrow = await prisma.rewardEscrow.create({
                data: {
                    organizationId: user.sub,
                    escrowAddress,
                    tokenAddress,
                    chainId: CHAIN_CONFIG.chainId,
                    deployTxHash: hash,
                },
            })

            // Update user record
            await prisma.user.update({
                where: { id: user.sub },
                data: { escrowContractAddress: escrowAddress },
            })

            return successResponse(c, {
                escrowAddress: escrow.escrowAddress,
                txHash: hash,
                chainId: escrow.chainId,
                blockExplorer: `${CHAIN_CONFIG.blockExplorer}/tx/${hash}`,
            }, 201)
        } catch (error: any) {
            console.error('[Rewards] Deploy escrow error:', error)
            return errorResponse(c, 500, error.message || 'Failed to deploy escrow')
        }
    }
)

// ── POST /rewards/deposit ────────────────────────────────────────────────────
// Organisation deposits a reward for an accepted report
rewardsRoutes.post(
    '/deposit',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', depositRewardSchema),
    async (c) => {
        const user = c.get('user')
        const { reportId, payeeAddress, amountUsdc } = c.req.valid('json')

        try {
            // Find the org's escrow
            const escrow = await prisma.rewardEscrow.findUnique({
                where: { organizationId: user.sub },
            })
            if (!escrow) {
                return errorResponse(c, 404, 'No escrow deployed. Deploy one first.')
            }

            // Verify report belongs to org and is accepted
            const report = await prisma.report.findUnique({
                where: { id: reportId },
                include: { program: { select: { ownerId: true } } },
            })
            if (!report) return errorResponse(c, 404, 'Report not found')
            if (report.program.ownerId !== user.sub && user.role !== 'ADMIN') {
                return errorResponse(c, 403, 'Not your report')
            }
            if (!['ACCEPTED', 'RESOLVED'].includes(report.status)) {
                return errorResponse(c, 400, 'Report must be accepted before depositing reward')
            }

            // Check for existing deposit
            const existingDeposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
            })
            if (existingDeposit) {
                return errorResponse(c, 409, 'Reward already deposited for this report', {
                    status: existingDeposit.status,
                })
            }

            const reportIdHash = reportIdToBytes32(reportId)
            const amountWei = BigInt(amountUsdc * 1e6).toString() // USDC has 6 decimals

            // Create DB record (off-chain tracking)
            // Actual on-chain deposit happens from the org's wallet via frontend
            const deposit = await prisma.rewardDeposit.create({
                data: {
                    escrowId: escrow.id,
                    reportId,
                    payeeAddress,
                    amountWei,
                    reportIdHash: reportIdHash,
                    status: 'LOCKED',
                },
            })

            // Update report
            await prisma.report.update({
                where: { id: reportId },
                data: {
                    rewardEstimateUsd: amountUsdc,
                    nextAction: 'Reward locked in escrow — awaiting hunter claim',
                },
            })

            return successResponse(c, {
                depositId: deposit.id,
                escrowAddress: escrow.escrowAddress,
                reportIdHash,
                payeeAddress,
                amountUsdc,
                amountWei,
                chainId: escrow.chainId,
            }, 201)
        } catch (error: any) {
            console.error('[Rewards] Deposit error:', error)
            return errorResponse(c, 500, error.message || 'Failed to create deposit')
        }
    }
)

// ── GET /rewards/claim-data/:reportId ────────────────────────────────────────
// Returns the EIP-712 typed data for the hunter to sign
rewardsRoutes.get(
    '/claim-data/:reportId',
    authMiddleware,
    async (c) => {
        const { reportId } = c.req.param()
        const user = c.get('user')

        try {
            const deposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
                include: { escrow: true },
            })
            if (!deposit) return errorResponse(c, 404, 'No reward deposit found for this report')
            if (deposit.status === 'CLAIMED') return errorResponse(c, 400, 'Reward already claimed')

            // Verify the user is the payee (bounty hunter)
            const userRecord = await prisma.user.findUnique({
                where: { id: user.sub },
                select: { walletAddress: true },
            })
            if (!userRecord?.walletAddress) {
                return errorResponse(c, 400, 'Set your wallet address to claim rewards')
            }
            if (userRecord.walletAddress.toLowerCase() !== deposit.payeeAddress.toLowerCase()) {
                return errorResponse(c, 403, 'You are not the designated payee for this reward')
            }

            const reportIdHash = reportIdToBytes32(reportId)
            const typedData = await buildClaimTypedData(
                deposit.escrow.escrowAddress as Address,
                reportIdHash,
                deposit.payeeAddress as Address
            )

            return successResponse(c, {
                typedData,
                escrowAddress: deposit.escrow.escrowAddress,
                reportIdHash,
                amountWei: deposit.amountWei,
                chainId: deposit.escrow.chainId,
            })
        } catch (error: any) {
            console.error('[Rewards] Claim data error:', error)
            return errorResponse(c, 500, error.message || 'Failed to build claim data')
        }
    }
)

// ── POST /rewards/allow-claim ────────────────────────────────────────────────
// Organisation marks a reward as claimable — backend-only, no wallet popup.
// This is the final org-side approval before the hunter can pull funds.
rewardsRoutes.post(
    '/allow-claim',
    authMiddleware,
    requireRole('ORGANIZATION', 'ADMIN'),
    zValidator('json', z.object({
        reportId: z.string().min(1),
    })),
    async (c) => {
        const user = c.get('user')
        const { reportId } = c.req.valid('json')

        try {
            const deposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
                include: { escrow: true },
            })

            if (!deposit) return errorResponse(c, 404, 'No reward deposit found for this report')
            if (deposit.status === 'CLAIMED') return errorResponse(c, 400, 'Reward already claimed')
            if (deposit.status === 'CLAIMABLE') return errorResponse(c, 400, 'Reward already marked as claimable')
            if (deposit.status !== 'LOCKED') return errorResponse(c, 400, `Cannot allow-claim from status: ${deposit.status}`)

            // Verify the calling org owns this escrow
            if (deposit.escrow.organizationId !== user.sub && user.role !== 'ADMIN') {
                return errorResponse(c, 403, 'You do not own this escrow')
            }

            await prisma.rewardDeposit.update({
                where: { id: deposit.id },
                data: { status: 'CLAIMABLE' },
            })

            await prisma.report.update({
                where: { id: reportId },
                data: { nextAction: 'Reward approved — hunter can now claim from the escrow' },
            })

            return successResponse(c, {
                reportId,
                status: 'CLAIMABLE',
                escrowAddress: deposit.escrow.escrowAddress,
                payeeAddress: deposit.payeeAddress,
                amountWei: deposit.amountWei,
            })
        } catch (error: any) {
            console.error('[Rewards] Allow-claim error:', error)
            return errorResponse(c, 500, error.message || 'Failed to allow claim')
        }
    }
)

// ── POST /rewards/claim ──────────────────────────────────────────────────────
// Hunter submits the signed claim — backend verifies stored signature then marks CLAIMED.
// The actual on-chain claimReward() call is submitted by the hunter from their own wallet.
rewardsRoutes.post(
    '/claim',
    authMiddleware,
    zValidator('json', claimRewardSchema),
    async (c) => {
        const user = c.get('user')
        const { reportId } = c.req.valid('json')

        try {
            const deposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
                include: { escrow: true },
            })
            if (!deposit) return errorResponse(c, 404, 'No reward deposit found')
            if (deposit.status === 'CLAIMED') return errorResponse(c, 400, 'Already claimed')
            if (deposit.status !== 'CLAIMABLE') {
                return errorResponse(c, 400, `Reward is not yet approved for claiming (status: ${deposit.status}). Wait for the organisation to allow the claim.`)
            }

            // Verify the claimer is the designated payee
            const userRecord = await prisma.user.findUnique({
                where: { id: user.sub },
                select: { walletAddress: true },
            })
            if (!userRecord?.walletAddress) {
                return errorResponse(c, 400, 'Set your wallet address first')
            }
            if (userRecord.walletAddress.toLowerCase() !== deposit.payeeAddress.toLowerCase()) {
                return errorResponse(c, 403, 'Not the designated payee')
            }

            // Verify the submission-time signature against the stored hunter wallet
            const rawReport = await prisma.report.findUnique({
                where: { id: reportId },
                select: { hunterWallet: true, hunterSignature: true },
            })

            if (rawReport?.hunterWallet && rawReport?.hunterSignature) {
                const valid = await verifySubmissionSignature(
                    reportId,
                    rawReport.hunterSignature as Hex,
                    rawReport.hunterWallet as Address
                )
                if (!valid) {
                    return errorResponse(c, 403, 'Submission signature verification failed — wallet mismatch')
                }
                // Also confirm the current user wallet matches the stored hunter wallet
                if (userRecord.walletAddress.toLowerCase() !== rawReport.hunterWallet.toLowerCase()) {
                    return errorResponse(c, 403, 'Current wallet does not match the wallet bound at submission')
                }
            }

            // Mark as CLAIMED in DB — hunter will submit claimReward() on-chain from their wallet
            await prisma.rewardDeposit.update({
                where: { id: deposit.id },
                data: {
                    status: 'CLAIMED',
                    claimedAt: new Date(),
                },
            })

            await prisma.report.update({
                where: { id: reportId },
                data: {
                    status: 'RESOLVED',
                    nextAction: 'Reward claimed — submit the on-chain claimReward() transaction from your wallet',
                    resolvedAt: new Date(),
                },
            })

            // Return the EIP-712 typed data so the hunter can sign + submit on-chain
            const reportIdHash = reportIdToBytes32(reportId) as Hex
            const typedData = await buildClaimTypedData(
                deposit.escrow.escrowAddress as Address,
                reportIdHash,
                deposit.payeeAddress as Address
            ).catch(() => null)

            return successResponse(c, {
                status: 'CLAIMED',
                reportId,
                payeeAddress: deposit.payeeAddress,
                amountWei: deposit.amountWei,
                escrowAddress: deposit.escrow.escrowAddress,
                chainId: deposit.escrow.chainId,
                // Typed data for the hunter to sign and submit claimReward() on-chain
                typedData,
                blockExplorer: CHAIN_CONFIG.blockExplorer,
            })
        } catch (error: any) {
            console.error('[Rewards] Claim error:', error)
            return errorResponse(c, 500, error.message || 'Claim failed')
        }
    }
)

// ── POST /rewards/confirm-claim ──────────────────────────────────────────────
// Frontend calls this after the hunter has submitted the on-chain tx directly
rewardsRoutes.post(
    '/confirm-claim',
    authMiddleware,
    zValidator('json', z.object({
        reportId: z.string().min(1),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid tx hash'),
    })),
    async (c) => {
        const user = c.get('user')
        const { reportId, txHash } = c.req.valid('json')

        try {
            const deposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
                include: { escrow: true },
            })
            if (!deposit) return errorResponse(c, 404, 'No reward deposit found')
            if (deposit.status === 'CLAIMED') return errorResponse(c, 400, 'Already claimed')

            // Verify on-chain
            const reportIdHash = reportIdToBytes32(reportId)
            const reward = await getRewardOnChain(
                deposit.escrow.escrowAddress as Address,
                reportIdHash
            )

            if (!reward.claimed) {
                return errorResponse(c, 400, 'On-chain reward not yet claimed. Transaction may still be pending.')
            }

            // Update DB
            await prisma.rewardDeposit.update({
                where: { id: deposit.id },
                data: {
                    status: 'CLAIMED',
                    claimTxHash: txHash,
                    claimedAt: new Date(),
                },
            })

            await prisma.report.update({
                where: { id: reportId },
                data: {
                    status: 'RESOLVED',
                    nextAction: 'Reward claimed successfully',
                    resolvedAt: new Date(),
                },
            })

            return successResponse(c, {
                status: 'CLAIMED',
                txHash,
                blockExplorer: `${CHAIN_CONFIG.blockExplorer}/tx/${txHash}`,
            })
        } catch (error: any) {
            console.error('[Rewards] Confirm claim error:', error)
            return errorResponse(c, 500, error.message || 'Failed to confirm claim')
        }
    }
)

// ── GET /rewards/:reportId ──────────────────────────────────────────────────
rewardsRoutes.get(
    '/:reportId',
    authMiddleware,
    async (c) => {
        const { reportId } = c.req.param()

        try {
            const deposit = await prisma.rewardDeposit.findUnique({
                where: { reportId },
                include: {
                    escrow: {
                        select: {
                            escrowAddress: true,
                            tokenAddress: true,
                            chainId: true,
                        },
                    },
                },
            })

            if (!deposit) return errorResponse(c, 404, 'No reward found for this report')

            return successResponse(c, {
                ...deposit,
                blockExplorer: CHAIN_CONFIG.blockExplorer,
            })
        } catch (error: any) {
            return errorResponse(c, 500, error.message || 'Failed to fetch reward')
        }
    }
)

// ── GET /rewards/escrow/:userId ──────────────────────────────────────────────
rewardsRoutes.get(
    '/escrow/:userId',
    authMiddleware,
    async (c) => {
        const { userId } = c.req.param()

        try {
            const escrow = await prisma.rewardEscrow.findUnique({
                where: { organizationId: userId },
                include: {
                    rewards: {
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                    },
                },
            })

            if (!escrow) return errorResponse(c, 404, 'No escrow found for this organisation')

            return successResponse(c, {
                ...escrow,
                blockExplorer: `${CHAIN_CONFIG.blockExplorer}/address/${escrow.escrowAddress}`,
            })
        } catch (error: any) {
            return errorResponse(c, 500, error.message || 'Failed to fetch escrow')
        }
    }
)
