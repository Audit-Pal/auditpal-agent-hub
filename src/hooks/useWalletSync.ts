import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useAuth } from '../contexts/AuthContext'

/**
 * useWalletSync
 *
 * Watches the connected wallet address and persists it to the AuditPal user
 * profile via PATCH /auth/me whenever it changes.
 *
 * Rules:
 *  - Only runs when the user is authenticated (has a session).
 *  - Skips the update if the address matches what is already stored.
 *  - Does not clear walletAddress when the wallet disconnects (prevents
 *    accidental data loss — the user can clear it manually from their profile).
 */
export function useWalletSync() {
  const { user, updateProfile } = useAuth()
  const { address, isConnected } = useAccount()
  const lastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (!isConnected || !address) return

    // Normalize to checksum-less lowercase for safe comparison.
    const normalized = address.toLowerCase()

    // Skip if already in sync (either with the DB copy or a previous sync).
    const storedAddress = user.walletAddress?.toLowerCase() ?? null
    if (normalized === storedAddress) return
    if (normalized === lastSyncedRef.current) return

    lastSyncedRef.current = normalized

    updateProfile({ walletAddress: address }).catch((err) => {
      console.error('[useWalletSync] Failed to persist wallet address:', err)
      // Reset so we retry on the next render cycle.
      lastSyncedRef.current = null
    })
  }, [address, isConnected, user, updateProfile])
}
