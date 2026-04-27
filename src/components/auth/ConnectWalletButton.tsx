import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect } from 'wagmi'

interface ConnectWalletButtonProps {
  /** Compact inline variant for use inside modals / nav */
  compact?: boolean
  className?: string
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * ConnectWalletButton
 *
 * Self-contained button that opens the Reown AppKit wallet modal when the
 * user is not connected, and shows a truncated address + disconnect option
 * when they are. Styled to match AuditPal's "Security OS" dark aesthetic.
 */
export function ConnectWalletButton({ compact = false, className = '' }: ConnectWalletButtonProps) {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Address badge */}
        <button
          type="button"
          onClick={() => open({ view: 'Account' })}
          className={[
            'group flex items-center gap-2 rounded-full border transition-all duration-200',
            compact
              ? 'border-[rgba(15,202,138,0.25)] bg-[rgba(15,202,138,0.07)] px-3 py-1.5 text-[12px]'
              : 'border-[rgba(15,202,138,0.25)] bg-[rgba(15,202,138,0.07)] px-4 py-2 text-[13px]',
            'font-mono font-medium text-[#0fca8a] hover:border-[rgba(15,202,138,0.5)] hover:bg-[rgba(15,202,138,0.12)]',
          ].join(' ')}
          title="Open wallet details"
        >
          {/* Live indicator dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0fca8a] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0fca8a]" />
          </span>
          {truncateAddress(address)}
        </button>

        {/* Disconnect */}
        <button
          type="button"
          onClick={() => disconnect()}
          title="Disconnect wallet"
          className={[
            'flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.07)] text-[#7f8896] transition-all duration-200 hover:border-[rgba(181,69,52,0.4)] hover:text-[#e05a3a]',
            compact ? 'h-7 w-7' : 'h-8 w-8',
          ].join(' ')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={compact ? 12 : 14}
            height={compact ? 12 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => open({ view: 'Connect' })}
      className={[
        'group flex items-center gap-2.5 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.06)] font-bold uppercase tracking-[0.12em] text-[#0fca8a] transition-all duration-200 hover:border-[rgba(15,202,138,0.45)] hover:bg-[rgba(15,202,138,0.12)] hover:shadow-[0_0_20px_rgba(15,202,138,0.15)]',
        compact ? 'px-3 py-1.5 text-[10px]' : 'px-5 py-2.5 text-[11px]',
        className,
      ].join(' ')}
    >
      {/* Wallet icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={compact ? 13 : 15}
        height={compact ? 13 : 15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 group-hover:scale-110"
      >
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
      </svg>
      Connect Wallet
    </button>
  )
}
