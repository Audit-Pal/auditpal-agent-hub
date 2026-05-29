/**
 * Blockchain Service — Base Sepolia (Chain ID: 84532)
 *
 * Viem-based client for interacting with RewardFactory and RewardEscrow
 * contracts on the Base Sepolia L2 testnet.
 */
import {
    createPublicClient,
    createWalletClient,
    http,
    type Address,
    type Hash,
    type Hex,
    keccak256,
    encodePacked,
    encodeAbiParameters,
    parseAbiParameters,
    recoverMessageAddress,
    toBytes,
} from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ── Config ────────────────────────────────────────────────────────────────────
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const FACTORY_ADDRESS = process.env.REWARD_FACTORY_ADDRESS as Address | undefined
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined

// ── ABIs ──────────────────────────────────────────────────────────────────────
export const REWARD_FACTORY_ABI = [
    {
        type: 'function',
        name: 'deployEscrow',
        inputs: [
            { name: 'orgAdmin', type: 'address' },
            { name: 'token', type: 'address' },
        ],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getEscrow',
        inputs: [{ name: 'orgAdmin', type: 'address' }],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'escrows',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalEscrows',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'owner',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'EscrowDeployed',
        inputs: [
            { name: 'orgAdmin', type: 'address', indexed: true },
            { name: 'escrow', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: false },
        ],
    },
] as const

export const REWARD_ESCROW_ABI = [
    {
        type: 'function',
        name: 'depositReward',
        inputs: [
            { name: 'reportId', type: 'bytes32' },
            { name: 'payee', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'claimReward',
        inputs: [
            { name: 'reportId', type: 'bytes32' },
            { name: 'signature', type: 'bytes' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getReward',
        inputs: [{ name: 'reportId', type: 'bytes32' }],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    { name: 'payee', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'claimed', type: 'bool' },
                    { name: 'refunded', type: 'bool' },
                    { name: 'depositedAt', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'nonces',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'DOMAIN_SEPARATOR',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'CLAIM_TYPEHASH',
        inputs: [],
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'admin',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'token',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'factory',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'fundProgram',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'totalAllocated',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalRewards',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'RewardDeposited',
        inputs: [
            { name: 'reportId', type: 'bytes32', indexed: true },
            { name: 'payee', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'RewardClaimed',
        inputs: [
            { name: 'reportId', type: 'bytes32', indexed: true },
            { name: 'payee', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
] as const

export const ERC20_ABI = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'transfer',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
    },
] as const

// ── Clients ───────────────────────────────────────────────────────────────────
export const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
})

function getWalletClient() {
    if (!DEPLOYER_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set')
    const account = privateKeyToAccount(DEPLOYER_KEY)
    return createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL),
    })
}

// ── Factory Helpers ───────────────────────────────────────────────────────────

export async function deployEscrow(orgAdmin: Address, token: Address): Promise<{ hash: Hash; escrowAddress: Address }> {
    if (!FACTORY_ADDRESS) throw new Error('REWARD_FACTORY_ADDRESS not set')

    const walletClient = getWalletClient()

    const hash = await walletClient.writeContract({
        address: FACTORY_ADDRESS,
        abi: REWARD_FACTORY_ABI,
        functionName: 'deployEscrow',
        args: [orgAdmin, token],
    } as any)

    // Wait for tx and extract escrow address from logs
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    const escrowLog = receipt.logs.find((log) => {
        try {
            return (log as any).topics[0] === keccak256(
                encodePacked(['string'], ['EscrowDeployed(address,address,address)'])
            )
        } catch {
            return false
        }
    })

    // The escrow address is the 2nd indexed topic (topics[2])
    const escrowAddress = escrowLog
        ? (`0x${(escrowLog as any).topics[2]?.slice(26)}` as Address)
        : ('0x0' as Address)

    return { hash, escrowAddress }
}

export async function getEscrowAddress(orgAdmin: Address): Promise<Address | null> {
    if (!FACTORY_ADDRESS) throw new Error('REWARD_FACTORY_ADDRESS not set')

    try {
        const addr = await publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: REWARD_FACTORY_ABI,
            functionName: 'escrows',
            args: [orgAdmin],
        } as any)
        return addr === '0x0000000000000000000000000000000000000000' ? null : addr as Address
    } catch {
        return null
    }
}

// ── Escrow Helpers ────────────────────────────────────────────────────────────

export async function getRewardOnChain(escrowAddress: Address, reportIdHash: Hex) {
    const reward = await (publicClient.readContract as any)({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'getReward',
        args: [reportIdHash],
    })
    return {
        payee: reward.payee,
        amount: reward.amount,
        claimed: reward.claimed,
        refunded: reward.refunded,
        depositedAt: Number(reward.depositedAt),
    }
}

export async function getClaimNonce(escrowAddress: Address, payee: Address): Promise<bigint> {
    return (publicClient.readContract as any)({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'nonces',
        args: [payee],
    })
}

export async function getDomainSeparator(escrowAddress: Address): Promise<Hex> {
    return (publicClient.readContract as any)({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'DOMAIN_SEPARATOR',
    })
}

export async function getClaimTypehash(escrowAddress: Address): Promise<Hex> {
    return (publicClient.readContract as any)({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'CLAIM_TYPEHASH',
    })
}

/**
 * Build the EIP-712 typed data object for a claim.
 * The hunter signs this client-side, then submits the signature to the contract.
 */
export async function buildClaimTypedData(
    escrowAddress: Address,
    reportIdHash: Hex,
    payeeAddress: Address
) {
    const nonce = await getClaimNonce(escrowAddress, payeeAddress)

    return {
        domain: {
            name: 'AuditPalEscrow',
            version: '1',
            chainId: baseSepolia.id,
            verifyingContract: escrowAddress,
        },
        types: {
            ClaimReward: [
                { name: 'reportId', type: 'bytes32' },
                { name: 'payee', type: 'address' },
                { name: 'escrow', type: 'address' },
                { name: 'nonce', type: 'uint256' },
            ],
        },
        primaryType: 'ClaimReward' as const,
        message: {
            reportId: reportIdHash,
            payee: payeeAddress,
            escrow: escrowAddress,
            nonce,
        },
    }
}

/**
 * Convert a report ID string to a bytes32 keccak256 hash.
 * This is used as the on-chain key for reward mapping.
 */
export function reportIdToBytes32(reportId: string): Hex {
    return keccak256(encodePacked(['string'], [reportId]))
}

/**
 * Deposit a reward on-chain using the server deployer wallet.
 * The escrow's ERC-20 token must have an allowance from the org wallet
 * for at least `amountWei` before calling this.
 */
export async function depositRewardOnChain(
    escrowAddress: Address,
    reportIdHash: Hex,
    payee: Address,
    amountWei: bigint
): Promise<Hash> {
    const walletClient = getWalletClient()
    const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'depositReward',
        args: [reportIdHash, payee, amountWei],
    } as any)
    return hash
}

/**
 * Verify that a hex-encoded eth_sign signature was produced by `expectedSigner`
 * over the message: "AuditPal report submission: <reportId>"
 *
 * Returns true if the recovered address matches (case-insensitive).
 */
export async function verifySubmissionSignature(
    reportId: string,
    signature: Hex,
    expectedSigner: Address
): Promise<boolean> {
    try {
        const message = `AuditPal report submission: ${reportId}`
        const recovered = await recoverMessageAddress({ message, signature })
        return recovered.toLowerCase() === expectedSigner.toLowerCase()
    } catch {
        return false
    }
}

// ── Network info ──────────────────────────────────────────────────────────────
export const CHAIN_CONFIG = {
    chainId: baseSepolia.id,
    chainName: 'Base Sepolia',
    rpcUrl: RPC_URL,
    blockExplorer: 'https://sepolia.basescan.org',
    factoryAddress: FACTORY_ADDRESS,
    mockUsdcAddress: process.env.MOCK_USDC_ADDRESS,
}
