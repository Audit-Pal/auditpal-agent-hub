import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { BASE_SEPOLIA_BLOCK_EXPLORER } from '../../lib/wallet'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'

interface EscrowInfo {
  id: string
  escrowAddress: string
  tokenAddress: string
  chainId: number
  deployTxHash: string
  createdAt: string
  rewards?: Array<{
    id: string
    reportId: string
    payeeAddress: string
    amountWei: string
    status: string
    createdAt: string
  }>
}

interface DepositFormData {
  reportId: string
  payeeAddress: string
  amountUsdc: number
}

interface EscrowDeployPanelProps {
  userId: string
  onEscrowDeployed?: (address: string) => void
}

export function EscrowDeployPanel({ userId, onEscrowDeployed }: EscrowDeployPanelProps) {
  const [escrow, setEscrow] = useState<EscrowInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositForm, setDepositForm] = useState<DepositFormData>({
    reportId: '',
    payeeAddress: '',
    amountUsdc: 0,
  })
  const [depositing, setDepositing] = useState(false)
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadEscrow()
  }, [userId])

  const loadEscrow = async () => {
    try {
      const res = await api.get<EscrowInfo>(`/rewards/escrow/${userId}`)
      if (res.success) {
        setEscrow(res.data)
      }
    } catch {
      // No escrow yet
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    setError(null)

    try {
      // Use a default token address for testnet (MockUSDC)
      // In production this would be the real USDC address
      const tokenAddress = import.meta.env.VITE_MOCK_USDC_ADDRESS || '0x0000000000000000000000000000000000000000'

      const res = await api.post<{
        escrowAddress: string
        txHash: string
        chainId: number
        blockExplorer: string
      }>('/rewards/deploy-escrow', { tokenAddress })

      if (res.success) {
        onEscrowDeployed?.(res.data.escrowAddress)
        loadEscrow()
      } else {
        setError(res.error || 'Failed to deploy escrow')
      }
    } catch (err: any) {
      setError(err.message || 'Deployment failed')
    } finally {
      setDeploying(false)
    }
  }

  const handleDeposit = async () => {
    if (!depositForm.reportId || !depositForm.payeeAddress || depositForm.amountUsdc <= 0) {
      setError('Fill in all fields')
      return
    }

    setDepositing(true)
    setError(null)
    setDepositSuccess(null)

    try {
      const res = await api.post('/rewards/deposit', {
        reportId: depositForm.reportId,
        payeeAddress: depositForm.payeeAddress,
        amountUsdc: depositForm.amountUsdc,
      })

      if (res.success) {
        setDepositSuccess(`Reward of $${depositForm.amountUsdc} USDC locked for report`)
        setShowDeposit(false)
        setDepositForm({ reportId: '', payeeAddress: '', amountUsdc: 0 })
        loadEscrow()
      } else {
        setError((res as any).error || 'Deposit failed')
      }
    } catch (err: any) {
      setError(err.message || 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,22,0.28)] px-5 py-5 backdrop-blur-[16px]">
        <p className="text-xs text-[var(--text-muted)] animate-pulse">Loading escrow...</p>
      </div>
    )
  }

  // ── No escrow yet — show deploy button ──────────────────────────────────
  if (!escrow) {
    return (
      <div className="rounded-[20px] border border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)] px-5 py-5 space-y-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-400">Reward Escrow</p>
        <p className="text-sm text-[var(--text-soft)] leading-relaxed">
          Deploy a smart contract escrow to manage bounty rewards on Base Sepolia.
          Rewards are locked on-chain and can only be claimed by the designated payee.
        </p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button variant="primary" onClick={handleDeploy} disabled={deploying}>
          {deploying ? 'Deploying to Base Sepolia...' : 'Deploy Reward Escrow'}
        </Button>
      </div>
    )
  }

  // ── Escrow exists — show details ────────────────────────────────────────
  return (
    <div className="rounded-[20px] border border-[rgba(15,202,138,0.15)] bg-[rgba(15,202,138,0.04)] px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Reward Escrow</p>
        <Badge tone="success">Deployed</Badge>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span>Contract</span>
          <a
            href={`${BASE_SEPOLIA_BLOCK_EXPLORER}/address/${escrow.escrowAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline font-mono"
          >
            {escrow.escrowAddress.slice(0, 6)}...{escrow.escrowAddress.slice(-4)}
          </a>
        </div>
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span>Network</span>
          <span className="text-[var(--text-soft)]">Base Sepolia ({escrow.chainId})</span>
        </div>
        <div className="flex items-center justify-between text-[var(--text-muted)]">
          <span>Rewards</span>
          <span className="text-[var(--text)]">{escrow.rewards?.length ?? 0}</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {depositSuccess && <p className="text-xs text-[var(--accent)]">{depositSuccess}</p>}

      {/* Deposit form */}
      {showDeposit ? (
        <div className="space-y-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Deposit Reward</p>
          <input
            placeholder="Report ID"
            value={depositForm.reportId}
            onChange={(e) => setDepositForm((f) => ({ ...f, reportId: e.target.value }))}
            className="w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] focus:border-[var(--accent)] focus:outline-none"
          />
          <input
            placeholder="Payee Wallet Address (0x...)"
            value={depositForm.payeeAddress}
            onChange={(e) => setDepositForm((f) => ({ ...f, payeeAddress: e.target.value }))}
            className="w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] focus:border-[var(--accent)] focus:outline-none font-mono"
          />
          <input
            type="number"
            placeholder="Amount (USDC)"
            value={depositForm.amountUsdc || ''}
            onChange={(e) => setDepositForm((f) => ({ ...f, amountUsdc: Number(e.target.value) }))}
            className="w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] focus:border-[var(--accent)] focus:outline-none"
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleDeposit} disabled={depositing}>
              {depositing ? 'Depositing...' : 'Lock Reward'}
            </Button>
            <Button variant="outline" onClick={() => setShowDeposit(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowDeposit(true)}>
          Deposit Reward for Report
        </Button>
      )}

      {/* Recent rewards */}
      {escrow.rewards && escrow.rewards.length > 0 && (
        <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">Recent Deposits</p>
          <div className="space-y-2">
            {escrow.rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[var(--text-soft)]">{r.reportId.slice(0, 12)}...</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text)]">${(Number(r.amountWei) / 1e6).toFixed(0)}</span>
                  <Badge tone={r.status === 'CLAIMED' ? 'success' : r.status === 'LOCKED' ? 'accent' : 'soft'}>
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
