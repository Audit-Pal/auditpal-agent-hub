import { motion } from 'framer-motion'

export function PageLoader() {
  return (
    <div className="flex w-full flex-col items-center justify-center py-20 opacity-80 mix-blend-screen">
      <motion.div
        className="relative flex h-16 w-16 items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 rounded-full border border-[var(--accent)]/20" />
        <div className="absolute inset-2 rounded-full border border-dashed border-[var(--accent)]/40 animate-[spin_4s_linear_infinite]" />
        <div className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)] animate-pulse" />
      </motion.div>
    </div>
  )
}
