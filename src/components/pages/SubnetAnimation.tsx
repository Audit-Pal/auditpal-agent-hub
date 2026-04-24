import { motion, type Variants } from 'framer-motion'

export function SubnetAnimation() {
  // Base line animation: smoothly draw lines in
  const drawLine: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 0.15,
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  }

  // Pulse packet animation: glowing line traversing the path
  const pulsePacket = (delay = 0, reverse = false): Variants => ({
    hidden: { pathLength: 0, pathOffset: reverse ? 1 : 0, opacity: 0 },
    visible: {
      pathLength: [0, 0.15, 0.15, 0],
      pathOffset: reverse ? [1, 1, 0, -0.15] : [0, 0, 0.85, 1],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "linear",
        delay
      }
    }
  })

  // Paths representing connections
  const PATHS = {
    agent1: "M150,90 C300,90 300,200 400,200",
    agent2: "M150,310 C300,310 300,200 400,200",
    protocol1: "M650,90 C500,90 500,200 400,200",
    protocol2: "M650,310 C500,310 500,200 400,200"
  }

  return (
    <div className="w-full h-full min-h-[440px] flex items-center justify-center relative bg-[rgba(6,8,11,0.6)] backdrop-blur-md rounded-[24px] border border-[rgba(255,255,255,0.05)] overflow-hidden shadow-2xl">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,202,138,0.06)_0%,transparent_60%)] pointer-events-none" />
      
      {/* Blueprint grid effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' } as React.CSSProperties}
      />

      <svg viewBox="0 0 800 400" className="w-full h-full min-w-[600px]">
        <defs>
          <linearGradient id="grad-agent" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#0fca8a" stopOpacity="1" offset="0%" />
            <stop stopColor="#12f4a6" stopOpacity="0" offset="100%" />
          </linearGradient>
          <linearGradient id="grad-protocol" x1="1" y1="0" x2="0" y2="0">
            <stop stopColor="#4d9fff" stopOpacity="1" offset="0%" />
            <stop stopColor="#2c75d4" stopOpacity="0" offset="100%" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Base Static Lines connecting nodes */}
        {Object.values(PATHS).map((d, i) => (
          <motion.path 
            key={`base-${i}`}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            variants={drawLine}
            initial="hidden"
            animate="visible"
          />
        ))}

        {/* Animated Data Packets */}
        <motion.path d={PATHS.agent1} fill="none" stroke="url(#grad-agent)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" variants={pulsePacket(0)} initial="hidden" animate="visible" />
        <motion.path d={PATHS.agent2} fill="none" stroke="url(#grad-agent)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" variants={pulsePacket(1.2)} initial="hidden" animate="visible" />
        <motion.path d={PATHS.protocol1} fill="none" stroke="url(#grad-protocol)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" variants={pulsePacket(0.6, true)} initial="hidden" animate="visible" />
        <motion.path d={PATHS.protocol2} fill="none" stroke="url(#grad-protocol)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" variants={pulsePacket(1.8, true)} initial="hidden" animate="visible" />

        {/* Center Node: Validator Hub */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: 'spring', stiffness: 100 }}>
          <circle cx="400" cy="200" r="50" fill="rgba(15,202,138,0.06)" stroke="rgba(15,202,138,0.3)" strokeWidth="1" filter="url(#glow)" />
          {/* Pulsing ring around center node */}
          <motion.circle cx="400" cy="200" r="50" fill="none" stroke="#0fca8a" strokeWidth="1" animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          
          <rect x="375" y="175" width="50" height="50" rx="12" fill="#0fca8a" />
          <path d="M390 195 l6 6 l14 -14" fill="none" stroke="#06080b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          
          <text x="400" y="275" fill="#eef1f6" fontSize="12" fontWeight="800" fontFamily="'Space Grotesk', sans-serif" textAnchor="middle" letterSpacing="0.1em">AUDITPAL SUBNET</text>
          <text x="400" y="292" fill="#7f8896" fontSize="10" fontWeight="500" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">Triage & Validation</text>
        </motion.g>

        {/* Left Nodes: Security Agents */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}>
          <circle cx="150" cy="90" r="28" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <path d="M142 86 h16 M142 94 h16" stroke="#0fca8a" strokeWidth="2" strokeLinecap="round" />
          <text x="150" y="140" fill="#eef1f6" fontSize="11" fontWeight="700" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">ATLAS TRIAGE</text>
          <text x="150" y="155" fill="#7f8896" fontSize="9" fontWeight="500" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">Agent Node</text>
        </motion.g>

        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 120 }}>
          <circle cx="150" cy="310" r="28" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <path d="M142 306 h16 M142 314 h16" stroke="#0fca8a" strokeWidth="2" strokeLinecap="round" />
          <text x="150" y="360" fill="#eef1f6" fontSize="11" fontWeight="700" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">MERIDIAN SOURCE</text>
          <text x="150" y="375" fill="#7f8896" fontSize="9" fontWeight="500" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">Agent Node</text>
        </motion.g>

        {/* Right Nodes: Target Protocols */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}>
          <circle cx="650" cy="90" r="28" fill="rgba(77,159,255,0.08)" stroke="rgba(77,159,255,0.4)" strokeWidth="1" />
          <rect x="642" y="82" width="16" height="16" rx="4" fill="none" stroke="#4d9fff" strokeWidth="2" />
          <text x="650" y="140" fill="#eef1f6" fontSize="11" fontWeight="700" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">BRIDGE V3</text>
          <text x="650" y="155" fill="#7f8896" fontSize="9" fontWeight="500" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">Protocol Sponsor</text>
        </motion.g>

        <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 120 }}>
          <circle cx="650" cy="310" r="28" fill="rgba(77,159,255,0.08)" stroke="rgba(77,159,255,0.4)" strokeWidth="1" />
          <rect x="642" y="302" width="16" height="16" rx="4" fill="none" stroke="#4d9fff" strokeWidth="2" />
          <text x="650" y="360" fill="#eef1f6" fontSize="11" fontWeight="700" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">VAULT FINANCE</text>
          <text x="650" y="375" fill="#7f8896" fontSize="9" fontWeight="500" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.05em">Protocol Sponsor</text>
        </motion.g>

      </svg>
    </div>
  )
}
