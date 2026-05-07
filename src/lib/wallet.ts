import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia, baseSepolia } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// ─── Project ID ──────────────────────────────────────────────────────────────
// Get a free Project ID from https://cloud.reown.com and set it in .env as:
//   VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
const projectId: string = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'YOUR_PROJECT_ID'

// ─── Networks ─────────────────────────────────────────────────────────────────
// Base Sepolia is the primary network for reward escrow operations.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [baseSepolia, mainnet, sepolia]

// ─── Wagmi Adapter ────────────────────────────────────────────────────────────
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
})

// ─── AppKit ───────────────────────────────────────────────────────────────────
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  allowUnsupportedChain: true, // Prevents aggressive network switch prompt on landing
  metadata: {
    name: 'AuditPal',
    description: 'AI-powered smart contract security & bug bounty platform',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://auditpal.io',
    icons: ['https://auditpal.io/favicon.ico'],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#0fca8a',
    '--w3m-border-radius-master': '12px',
    '--w3m-font-family': "'Space Grotesk', sans-serif",
    '--w3m-color-mix': '#06080b',
    '--w3m-color-mix-strength': 40,
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

// ─── Reward Escrow Constants ──────────────────────────────────────────────────
export const BASE_SEPOLIA_CHAIN_ID = 84532
export const BASE_SEPOLIA_BLOCK_EXPLORER = 'https://sepolia.basescan.org'

