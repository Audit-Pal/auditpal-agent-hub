import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export const CheckoutSuccess = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#09131b] border border-[rgba(15,202,138,0.2)] rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#0fca8a] opacity-[0.03] blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#0fca8a] opacity-[0.03] blur-[100px] pointer-events-none" />

        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 bg-[rgba(15,202,138,0.1)] rounded-full flex items-center justify-center border border-[rgba(15,202,138,0.3)]"
          >
            <CheckCircle className="w-10 h-10 text-[#0fca8a]" />
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Payment Successful!</h1>
        <p className="text-[var(--text-muted)] mb-8">
          Your credits have been securely processed and added to your AuditPal account.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-left">
            <div className="w-8 h-8 rounded-lg bg-[rgba(15,202,138,0.1)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#0fca8a]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Credits Status</p>
              <p className="text-sm text-white font-medium">Activated & Ready to Use</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-left">
            <div className="w-8 h-8 rounded-lg bg-[rgba(15,202,138,0.1)] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#0fca8a]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Priority Triage</p>
              <p className="text-sm text-white font-medium">Access Enabled</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/bounties')}
            className="w-full py-3 bg-[#0fca8a] hover:bg-[#0db67c] text-[#09131b] font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Go to Bounties
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-white font-medium rounded-xl transition-all"
          >
            Return Home
          </button>
        </div>

        <p className="mt-6 text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
          Powered by AuditPal Security OS
        </p>
      </motion.div>
    </div>
  )
}
