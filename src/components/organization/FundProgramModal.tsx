import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
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

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  if (error instanceof Error) return error.message
  return 'An error occurred during activation'
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
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setAmount(maxBountyUsd)
  }, [isOpen, maxBountyUsd])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (amount <= 0) {
      showToast('Please enter a valid funding amount.', 'error')
      return
    }

    setProcessing(true)

    try {
      const fundRes = await api.post(`/programs/${programId}/fund`, {
        amount: Math.round(amount),
      })

      if (!fundRes.success) {
        throw new Error(fundRes.error || 'Failed to activate program')
      }

      showToast('Program activated.', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Activation failed:', error)
      showToast(getErrorMessage(error), 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
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
          className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0A0D12] p-8 shadow-2xl"
        >
          <div className="flex flex-col">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)]">
              <svg className="h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22m-7-11h14M4 7h16M4 17h16" />
              </svg>
            </div>

            <h2 className="text-2xl font-serif text-[var(--text)]">Activate Program</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
              Temporarily activate this bounty without deploying or funding an on-chain escrow.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="field-label block mb-2 text-[var(--text-muted)] text-xs uppercase tracking-wider font-bold">Funding Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    className="field !pl-8 w-full"
                    required
                    min="1"
                    step="1"
                    disabled={processing}
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-[rgba(15,202,138,0.16)] bg-[rgba(15,202,138,0.06)] px-4 py-3 text-xs font-semibold text-[var(--accent)]">
                Direct activation mode
              </div>

              <div className="pt-4 flex w-full flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? 'Activating...' : 'Activate Program'}
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
    </AnimatePresence>,
    document.body,
  )
}
