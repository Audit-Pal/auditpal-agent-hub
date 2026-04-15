import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(3,8,12,0.88)] backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-[rgba(0,212,168,0.22)] bg-[rgba(9,18,27,0.96)] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.8)]"
          >
            <div className="flex flex-col items-center text-center">
              {isDestructive && (
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--critical-soft)] border border-[rgba(181,69,52,0.2)]">
                  <svg className="h-8 w-8 text-[var(--critical-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              
              <h2 className="text-2xl font-serif text-[var(--text)]">{title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-soft)]">
                {message}
              </p>
              
              <div className="mt-8 flex w-full flex-col gap-3">
                <Button
                  variant={isDestructive ? 'primary' : 'primary'}
                  size="lg"
                  className={isDestructive ? 'bg-[var(--critical)] text-white hover:bg-[var(--critical-strong)]' : ''}
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                >
                  {confirmLabel}
                </Button>
                <Button variant="outline" size="lg" onClick={onClose}>
                  {cancelLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
