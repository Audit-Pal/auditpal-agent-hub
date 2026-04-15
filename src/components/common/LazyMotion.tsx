import { LazyMotion, domAnimation, m } from 'framer-motion'
import type { ReactNode } from 'react'

interface LazyMotionWrapperProps {
  children: ReactNode
}

/**
 * Lazy-loaded Framer Motion wrapper that only loads animation features when needed.
 * This prevents Framer Motion from blocking initial page load.
 */
export function LazyMotionWrapper({ children }: LazyMotionWrapperProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}

// Export the lightweight motion component
export { m as motion }
