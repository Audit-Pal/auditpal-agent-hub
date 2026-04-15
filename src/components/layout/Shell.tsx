import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface ShellProps {
  children: React.ReactNode
  navigation: React.ReactNode
}

export function Shell({ children, navigation }: ShellProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen font-sans text-[var(--text)] antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--accent-strong)]">
      {/* Fixed ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,168,0.08),transparent_70%)] blur-[80px]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(30,100,255,0.07),transparent_70%)] blur-[80px]" />
        <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,212,168,0.05),transparent_70%)] blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {navigation}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
