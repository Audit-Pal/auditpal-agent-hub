import { useState } from 'react'
import { useAccount, useSignTypedData, useWriteContract } from 'wagmi'
import { api } from '../../lib/api'
import { BASE_SEPOLIA_BLOCK_EXPLORER } from '../../lib/wallet'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'

// ── Escrow ABI (claim function only) ─────────────────────────────────────────
const ESCROW_CLAIM_ABI = [
  {
    type: 'function' as const,
    name: 'claimReward' as const,
    inputs: [
      { name: 'reportId', type: 'bytes32' as const },
      { name: 'signature', type: 'bytes' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const

interface RewardData {
  escrowAddress: string
  reportIdHash: string
  amountWei: string
  chainId: number
  status: string
  claimTxHash?: string
  depositTxHash?: string
  blockExplorer?: string
}

type ClaimStep = 'idle' | 'loading' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error'

interface RewardClaimPanelProps {
  reportId: string
  reportStatus: string
  canClaim: boolean // true if user is the bounty hunter
}

export function RewardClaimPanel({ reportId, reportStatus, canClaim }: RewardClaimPanelProps) {
  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync } = useWriteContract()

  const [rewardData, setRewardData] = useState<RewardData | null>(null)
  const [step, setStep] = useState<ClaimStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Fetch reward info
  const loadReward = async () => {
    try {
      const res = await api.get<RewardData>(`/rewards/${reportId}`)
      if (res.success) {
        setRewardData(res.data)
        setLoaded(true)
      }
    } catch {
      // No reward deposited yet — that's fine
      setLoaded(true)
    }
  }

  if (!loaded) {
    loadReward()
  }

  // No reward deposited
  if (loaded && !rewardData) {
    if (reportStatus === 'ACCEPTED') {
      return (
        <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-5 py-5 backdrop-blur-[16px]">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Reward</p>
          <p className="text-sm text-[var(--text-soft)]">Awaiting reward deposit from organisation</p>
        </div>
      )
    }
    return null
  }

  if (!rewardData) return null

  const amountUsdc = (Number(rewardData.amountWei) / 1e6).toFixed(2)
  const isClaimed = rewardData.status === 'CLAIMED'

  // ── Claimed state ────────────────────────────────────────────────────────
  if (isClaimed) {
    return (
      <div className="rounded-[20px] border border-[rgba(15,202,138,0.2)] bg-[rgba(15,202,138,0.06)] px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✅</span>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Reward Claimed</p>
        </div>
        <p className="text-2xl font-serif text-[var(--accent-strong)] mb-3">${amountUsdc} USDC</p>
        {(rewardData.claimTxHash || txHash) && (
          <a
            href={`${BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${rewardData.claimTxHash || txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--accent)] hover:underline font-mono break-all"
          >
            View transaction →
          </a>
        )}
      </div>
    )
  }

  // ── Claim flow ────────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!isConnected || !address) {
      setError('Connect your wallet first')
      return
    }

    setStep('loading')
    setError(null)

    try {
      // 1. Get typed data from backend
      setStep('loading')
      const claimRes = await api.get<{
        typedData: any
        escrowAddress: string
        reportIdHash: string
      }>(`/rewards/claim-data/${reportId}`)

      if (!claimRes.success) {
        throw new Error(claimRes.error || 'Failed to get claim data')
      }

      const { typedData, escrowAddress, reportIdHash } = claimRes.data

      // 2. Sign EIP-712 typed data with wallet
      setStep('signing')
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      })

      // 3. Submit on-chain claim transaction
      setStep('submitting')
      const hash = await writeContractAsync({
        address: escrowAddress as `0x${string}`,
        abi: ESCROW_CLAIM_ABI,
        functionName: 'claimReward',
        args: [reportIdHash as `0x${string}`, signature],
      })

      setTxHash(hash)
      setStep('confirming')

      // 4. Confirm with backend
      const confirmRes = await api.post(`/rewards/confirm-claim`, {
        reportId,
        txHash: hash,
      })

      if (confirmRes.success) {
        setStep('done')
        setRewardData((prev) => prev ? { ...prev, status: 'CLAIMED', claimTxHash: hash } : prev)
      } else {
        // Tx succeeded on-chain but backend sync failed — still show success
        setStep('done')
      }
    } catch (err: any) {
      console.error('[Claim] Error:', err)
      setError(err.shortMessage || err.message || 'Claim failed')
      setStep('error')
    }
  }

  const stepLabels: Record<ClaimStep, string> = {
    idle: '',
    loading: 'Preparing claim...',
    signing: 'Sign the message in your wallet...',
    submitting: 'Submitting transaction...',
    confirming: 'Confirming on-chain...',
    done: 'Reward claimed!',
    error: 'Claim failed',
  }

  return (
    <div className="rounded-[20px] border border-[rgba(15,202,138,0.2)] bg-[rgba(15,202,138,0.06)] px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Reward Escrow</p>
        <Badge tone="success">{rewardData.status}</Badge>
      </div>

      <p className="text-3xl font-serif text-[var(--accent-strong)]">${amountUsdc} <span className="text-lg text-[var(--text-soft)]">USDC</span></p>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span>Network</span>
          <span className="text-[var(--text-soft)]">Base Sepolia</span>
        </div>
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span>Escrow</span>
          <a
            href={`${BASE_SEPOLIA_BLOCK_EXPLORER}/address/${rewardData.escrowAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline font-mono"
          >
            {rewardData.escrowAddress?.slice(0, 6)}...{rewardData.escrowAddress?.slice(-4)}
          </a>
        </div>
      </div>

      {/* Status message */}
      {step !== 'idle' && step !== 'done' && (
        <div className={`text-xs py-2 px-3 rounded-lg ${step === 'error'
            ? 'bg-[rgba(255,100,100,0.1)] text-red-400'
            : 'bg-[rgba(15,202,138,0.1)] text-[var(--accent)]'
          }`}>
          <span className={step !== 'error' ? 'animate-pulse' : ''}>{stepLabels[step]}</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {txHash && (
        <a
          href={`${BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--accent)] hover:underline font-mono break-all block"
        >
          Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)} →
        </a>
      )}

      {/* Claim button — only for bounty hunters */}
      {canClaim && !isClaimed && step !== 'done' && (
        <Button
          variant="primary"
          onClick={handleClaim}
          disabled={step !== 'idle' && step !== 'error'}
        >
          {!isConnected ? 'Connect Wallet to Claim' : step === 'error' ? 'Retry Claim' : 'Sign & Claim Reward'}
        </Button>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
          <span>✅</span>
          <span className="font-semibold">Reward claimed successfully!</span>
        </div>
      )}
    </div>
  )
}
