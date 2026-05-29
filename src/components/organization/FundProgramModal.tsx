import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../common/Button'
import { api } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'

interface FundProgramModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  programId: string
  maxBountyUsd: number
}

export function FundProgramModal({
  isOpen,
  onClose,
  onSuccess,
  programId,
  maxBountyUsd,
}: FundProgramModalProps) {
  const { showToast } = useToast()
  const [amount, setAmount] = useState<number>(maxBountyUsd)
  const [tokenAddress, setTokenAddress] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  // Use the env variable or a fallback for the mock token
  const defaultToken = import.meta.env.VITE_MOCK_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

  useEffect(() => {
    if (isOpen) {
      setAmount(maxBountyUsd)
      setTokenAddress(defaultToken)
    }
  }, [isOpen, maxBountyUsd, defaultToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      showToast('Please enter a valid funding amount', 'error')
      return
    }

    setProcessing(true)
    try {
      // 1. Deploy Escrow (if not exists)
      const deployRes = await api.post('/rewards/deploy-escrow', { tokenAddress })
      // We expect success or 409 (already exists). If it's a real error, throw.
      if (!deployRes.success && (deployRes as any).status !== 409 && deployRes.error !== 'Escrow already deployed') {
        throw new Error(deployRes.error || 'Failed to deploy escrow')
      }

      // 2. Fund & Activate Program
      const fundRes = await api.post(`/programs/${programId}/fund`, { amount })
      if (!fundRes.success) {
        throw new Error(fundRes.error || 'Failed to fund program')
      }

      showToast('Program funded and escrow deployed successfully!', 'success')
      onSuccess()
      onClose()
    } catch (err) {
      const error = err as Error;
      console.error('Funding failed:', error)
      showToast(error.message || 'An error occurred during activation', 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!processing ? onClose : undefined}
            className="absolute inset-0 bg-[rgba(3,8,12,0.88)] backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0A0D12] p-8 shadow-2xl"
          >
            <div className="flex flex-col">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)]">
                <svg className="h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22m-7-11h14M4 7h16M4 17h16" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-serif text-[var(--text)]">Fund & Activate</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
                Deploy your on-chain reward escrow and fund the program to go live. Your escrow will be securely deployed on Base Sepolia.
              </p>
              
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label className="field-label block mb-2 text-[var(--text-muted)] text-xs uppercase tracking-wider font-bold">Funding Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="field !pl-8 w-full"
                      required
                      min="1"
                      disabled={processing}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label block mb-2 text-[var(--text-muted)] text-xs uppercase tracking-wider font-bold">Payout Token</label>
                  <select
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="field w-full"
                    disabled={processing}
                    required
                  >
                    <option value={defaultToken}>Mock USDC (Base Sepolia)</option>
                    {/* Additional tokens could be added here in the future */}
                  </select>
                </div>

                <div className="pt-4 flex w-full flex-col gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Deploy & Activate'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="lg" 
                    onClick={onClose}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
