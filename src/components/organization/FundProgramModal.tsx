import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { decodeEventLog, formatUnits, parseUnits, zeroAddress, type Address, type Hex } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { Button } from '../common/Button'
import { ConnectWalletButton } from '../auth/ConnectWalletButton'
import { api } from '../../lib/api'
import { BASE_SEPOLIA_BLOCK_EXPLORER, BASE_SEPOLIA_CHAIN_ID } from '../../lib/wallet'
import { ERC20_ABI, REWARD_ESCROW_ABI, REWARD_FACTORY_ABI } from '../../lib/rewardContracts'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

interface FundProgramModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  programId: string
  maxBountyUsd: number
}

interface ChainConfig {
  chainId: number
  blockExplorer: string
  factoryAddress?: string
  mockUsdcAddress?: string
}

interface VerifiedEscrow {
  escrowAddress: Address
  tokenAddress: Address
}

type FundingStep = 'idle' | 'syncing' | 'checking' | 'deploying' | 'approving' | 'funding' | 'registering' | 'activating'

const zeroHash = `0x${'0'.repeat(64)}` as Hex
const approvalPropagationTimeoutMs = 30_000
const approvalPropagationPollMs = 1_500

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isAddress(value?: string | null): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value || '')
}

function formatAddress(value?: string | null) {
  if (!value) return 'Not connected'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'shortMessage' in error) {
    return String((error as { shortMessage: unknown }).shortMessage)
  }
  if (typeof error === 'object' && error && 'details' in error) {
    return String((error as { details: unknown }).details)
  }
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  if (error instanceof Error) return error.message
  return 'An error occurred during activation'
}

function formatTokenAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  })
}

export function FundProgramModal({
  isOpen,
  onClose,
  onSuccess,
  programId,
  maxBountyUsd,
}: FundProgramModalProps) {
  const { user, updateProfile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const { address, chainId, isConnected } = useAccount()
  const publicClient = usePublicClient({ chainId: BASE_SEPOLIA_CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [amount, setAmount] = useState<number>(maxBountyUsd)
  const [tokenAddress, setTokenAddress] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<FundingStep>('idle')
  const [chainConfig, setChainConfig] = useState<ChainConfig | null>(null)
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const defaultToken = import.meta.env.VITE_MOCK_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
  const configuredFactoryAddress = chainConfig?.factoryAddress || import.meta.env.VITE_REWARD_FACTORY_ADDRESS || ''
  const blockExplorer = chainConfig?.blockExplorer || BASE_SEPOLIA_BLOCK_EXPLORER

  useEffect(() => {
    if (!isOpen) return

    setAmount(maxBountyUsd)
    setTokenAddress(defaultToken)
    setEscrowAddress(user?.escrowContractAddress || null)
    setTxHash(null)
    setStep('idle')

    api.get<ChainConfig>('/rewards/chain-config').then((res) => {
      if (res.success) {
        setChainConfig(res.data)
        setTokenAddress(res.data.mockUsdcAddress || defaultToken)
      }
    }).catch((error) => {
      console.error('Failed to load chain config', error)
    })
  }, [defaultToken, isOpen, maxBountyUsd, user?.escrowContractAddress])

  const waitForReceipt = async (hash: Hex) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')
    return publicClient.waitForTransactionReceipt({ hash })
  }

  const getVerifiedEscrow = async (
    candidateEscrow: Address,
    orgAddress: Address,
    expectedFactoryAddress: Address,
  ): Promise<VerifiedEscrow | null> => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    const bytecode = await publicClient.getBytecode({ address: candidateEscrow })
    if (!bytecode || bytecode === '0x') return null

    try {
      const [escrowAdmin, escrowToken, escrowFactory] = await Promise.all([
        publicClient.readContract({
          address: candidateEscrow,
          abi: REWARD_ESCROW_ABI,
          functionName: 'admin',
        }),
        publicClient.readContract({
          address: candidateEscrow,
          abi: REWARD_ESCROW_ABI,
          functionName: 'token',
        }),
        publicClient.readContract({
          address: candidateEscrow,
          abi: REWARD_ESCROW_ABI,
          functionName: 'factory',
        }),
      ])

      if (String(escrowAdmin).toLowerCase() !== orgAddress.toLowerCase()) return null
      if (String(escrowFactory).toLowerCase() !== expectedFactoryAddress.toLowerCase()) return null
      if (!isAddress(escrowToken)) return null

      await publicClient.readContract({
        address: candidateEscrow,
        abi: REWARD_ESCROW_ABI,
        functionName: 'totalAllocated',
      })

      return {
        escrowAddress: candidateEscrow,
        tokenAddress: escrowToken,
      }
    } catch {
      return null
    }
  }

  const readFactoryEscrowAddress = async (factoryAddress: Address, orgAddress: Address): Promise<Address | null> => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    const existing = await publicClient.readContract({
      address: factoryAddress,
      abi: REWARD_FACTORY_ABI,
      functionName: 'escrows',
      args: [orgAddress],
    })

    if (!isAddress(existing) || existing.toLowerCase() === zeroAddress.toLowerCase()) return null
    return existing
  }

  const getFactoryEscrow = async (factoryAddress: Address, orgAddress: Address) => {
    const existing = await readFactoryEscrowAddress(factoryAddress, orgAddress)
    if (!existing) return null

    const verifiedEscrow = await getVerifiedEscrow(existing, orgAddress, factoryAddress)
    if (!verifiedEscrow) {
      throw new Error('The configured reward factory returned an escrow that does not match the current funding contract. Update the reward factory address, then deploy a new escrow.')
    }

    return verifiedEscrow
  }

  const readTokenMeta = async (payoutToken: Address) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    const [decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: payoutToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }).catch(() => 6),
      publicClient.readContract({
        address: payoutToken,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }).catch(() => 'USDC'),
    ])

    return { decimals: Number(decimals), symbol: String(symbol) }
  }

  const assertTokenBalance = async (
    payoutToken: Address,
    ownerAddress: Address,
    amountWei: bigint,
    decimals: number,
    symbol: string,
  ) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    let balance: bigint
    try {
      balance = await publicClient.readContract({
        address: payoutToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [ownerAddress],
      })
    } catch (error) {
      throw new Error(
        `Could not read ${symbol} balance from token ${formatAddress(payoutToken)}. ` +
        `Check that the selected payout token is an ERC-20 on Base Sepolia. ${getErrorMessage(error)}`
      )
    }

    if (balance < amountWei) {
      throw new Error(
        `Insufficient ${symbol} balance. Need ${formatTokenAmount(amountWei, decimals)} ${symbol}, ` +
        `but this wallet has ${formatTokenAmount(balance, decimals)} ${symbol}.`
      )
    }
  }

  const readEscrowAllowance = async (
    payoutToken: Address,
    ownerAddress: Address,
    spenderAddress: Address,
    symbol: string,
  ) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    try {
      return await publicClient.readContract({
        address: payoutToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
      })
    } catch (error) {
      throw new Error(
        `Could not verify ${symbol} approval for escrow ${formatAddress(spenderAddress)}. ` +
        `${getErrorMessage(error)}`
      )
    }
  }

  const waitForEscrowAllowance = async (
    payoutToken: Address,
    ownerAddress: Address,
    spenderAddress: Address,
    amountWei: bigint,
    decimals: number,
    symbol: string,
  ) => {
    const deadline = Date.now() + approvalPropagationTimeoutMs
    let allowance = await readEscrowAllowance(payoutToken, ownerAddress, spenderAddress, symbol)

    while (allowance < amountWei && Date.now() < deadline) {
      await sleep(approvalPropagationPollMs)
      allowance = await readEscrowAllowance(payoutToken, ownerAddress, spenderAddress, symbol)
    }

    if (allowance < amountWei) {
      throw new Error(
        `${symbol} spending limit is not visible yet. Needed ${formatTokenAmount(amountWei, decimals)} ${symbol}, ` +
        `allowance is ${formatTokenAmount(allowance, decimals)} ${symbol}. Please try funding again.`
      )
    }

    return allowance
  }

  const simulateTokenApproval = async (
    payoutToken: Address,
    ownerAddress: Address,
    spenderAddress: Address,
    amountWei: bigint,
    symbol: string,
  ) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    try {
      await publicClient.simulateContract({
        address: payoutToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, amountWei],
        account: ownerAddress,
      })
    } catch (error) {
      throw new Error(
        `${symbol} approval simulation failed. ` +
        `Check that token ${formatAddress(payoutToken)} is the USDC token your wallet holds. ${getErrorMessage(error)}`
      )
    }
  }

  const simulateEscrowFunding = async (
    nextEscrowAddress: Address,
    orgAddress: Address,
    amountWei: bigint,
    symbol: string,
  ) => {
    if (!publicClient) throw new Error('Wallet client is not ready yet.')

    try {
      await publicClient.simulateContract({
        address: nextEscrowAddress,
        abi: REWARD_ESCROW_ABI,
        functionName: 'fundProgram',
        args: [amountWei],
        account: orgAddress,
      })
    } catch (error) {
      throw new Error(`Escrow funding simulation failed for ${symbol}. ${getErrorMessage(error)}`)
    }
  }

  const deployEscrow = async (factoryAddress: Address, orgAddress: Address, payoutToken: Address) => {
    setStep('deploying')
    showToast('Creating escrow contract in your wallet...', 'info')

    let hash: Hex
    try {
      hash = await writeContractAsync({
        address: factoryAddress,
        abi: REWARD_FACTORY_ABI,
        functionName: 'deployEscrow',
        args: [orgAddress, payoutToken],
      })
    } catch (error) {
      throw new Error(`Escrow contract creation failed. ${getErrorMessage(error)}`)
    }
    setTxHash(hash)

    const receipt = await waitForReceipt(hash)
    if (receipt.status !== 'success') throw new Error('Escrow creation transaction failed.')

    const deploymentEvent = receipt.logs
      .filter((log) => log.address.toLowerCase() === factoryAddress.toLowerCase())
      .map((log) => {
        try {
          return decodeEventLog({
            abi: REWARD_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          })
        } catch {
          return null
        }
      })
      .find((log) => log?.eventName === 'EscrowDeployed')

    const eventArgs = deploymentEvent?.args as { orgAdmin?: unknown; escrow?: unknown; token?: unknown } | undefined
    const eventOrgAdmin = typeof eventArgs?.orgAdmin === 'string' ? eventArgs.orgAdmin : null
    const eventEscrow = typeof eventArgs?.escrow === 'string' ? eventArgs.escrow : null
    const eventToken = typeof eventArgs?.token === 'string' ? eventArgs.token : null

    if (deploymentEvent) {
      if (!isAddress(eventEscrow)) {
        throw new Error('Escrow deployment event did not include a valid escrow address.')
      }
      if (!isAddress(eventOrgAdmin) || eventOrgAdmin.toLowerCase() !== orgAddress.toLowerCase()) {
        throw new Error('Escrow deployment event did not match the connected organization wallet.')
      }
      if (!isAddress(eventToken) || eventToken.toLowerCase() !== payoutToken.toLowerCase()) {
        throw new Error('Escrow deployment event did not match the selected payout token.')
      }
    }

    const factoryEscrow = await readFactoryEscrowAddress(factoryAddress, orgAddress)
    const deployedAddress = isAddress(eventEscrow) ? eventEscrow : factoryEscrow
    if (!isAddress(deployedAddress)) throw new Error('Escrow deployment succeeded, but the factory did not record an escrow address.')

    if (!factoryEscrow || factoryEscrow.toLowerCase() !== deployedAddress.toLowerCase()) {
      throw new Error('Escrow deployment succeeded, but the factory mapping does not point at the deployed escrow.')
    }

    const verifiedEscrow = await getVerifiedEscrow(deployedAddress, orgAddress, factoryAddress)
    if (!verifiedEscrow) throw new Error('Escrow deployment succeeded, but the new escrow failed verification.')
    if (verifiedEscrow.tokenAddress.toLowerCase() !== payoutToken.toLowerCase()) {
      throw new Error('The newly deployed escrow uses a different payout token than the selected token.')
    }

    setEscrowAddress(verifiedEscrow.escrowAddress)
    return { ...verifiedEscrow, deployTxHash: hash }
  }

  const registerProgramEscrow = async (
    nextEscrowAddress: Address,
    payoutToken: Address,
    deployTxHash: Hex,
    approvalTxHash: Hex | undefined,
    fundingTxHash: Hex,
  ) => {
    const res = await api.post<{ escrowAddress: string }>(`/programs/${programId}/register-escrow`, {
      escrowAddress: nextEscrowAddress,
      tokenAddress: payoutToken,
      deployTxHash,
      fundingTxHash,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      ...(approvalTxHash ? { approvalTxHash } : {}),
    })

    if (!res.success) throw new Error(res.error || 'Failed to save escrow contract')

    setEscrowAddress(res.data.escrowAddress)
    await refreshProfile()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!isConnected || !address) {
      showToast('Connect MetaMask or another EVM wallet first.', 'error')
      return
    }
    if (!isAddress(configuredFactoryAddress)) {
      showToast('Reward factory address is not configured.', 'error')
      return
    }
    if (!isAddress(tokenAddress)) {
      showToast('Payout token address is invalid.', 'error')
      return
    }
    if (amount <= 0) {
      showToast('Please enter a valid funding amount.', 'error')
      return
    }

    setProcessing(true)
    setTxHash(null)
    setStep('syncing')

    try {
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })
      }

      await updateProfile({ walletAddress: address })

      const factoryAddress = configuredFactoryAddress as Address
      const orgAddress = address as Address
      setStep('checking')
      const factoryEscrow = await getFactoryEscrow(factoryAddress, orgAddress)

      if (factoryEscrow) {
        setEscrowAddress(factoryEscrow.escrowAddress)

        if (
          isAddress(user?.escrowContractAddress) &&
          user.escrowContractAddress.toLowerCase() !== factoryEscrow.escrowAddress.toLowerCase()
        ) {
          showToast('Using the escrow registered by the configured reward factory.', 'info')
        }
      } else if (isAddress(user?.escrowContractAddress)) {
        showToast('Saved escrow is not registered on this reward factory. Deploying a new escrow...', 'info')
      }

      const escrowDeployment = factoryEscrow
        ? {
          escrowAddress: factoryEscrow.escrowAddress,
          deployTxHash: zeroHash,
          tokenAddress: factoryEscrow.tokenAddress,
        }
        : await deployEscrow(factoryAddress, orgAddress, tokenAddress as Address)

      const payoutToken = escrowDeployment.tokenAddress
      setTokenAddress(payoutToken)

      const { decimals, symbol } = await readTokenMeta(payoutToken)
      const amountWei = parseUnits(String(amount), decimals)

      await assertTokenBalance(payoutToken, orgAddress, amountWei, decimals, symbol)

      let approveHash: Hex | undefined
      const currentAllowance = await readEscrowAllowance(payoutToken, orgAddress, escrowDeployment.escrowAddress, symbol)

      if (currentAllowance < amountWei) {
        setStep('approving')
        await simulateTokenApproval(payoutToken, orgAddress, escrowDeployment.escrowAddress, amountWei, symbol)

        try {
          approveHash = await writeContractAsync({
            address: payoutToken,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [escrowDeployment.escrowAddress, amountWei],
          })
        } catch (error) {
          throw new Error(`${symbol} approval failed. ${getErrorMessage(error)}`)
        }
        setTxHash(approveHash)
        const approveReceipt = await waitForReceipt(approveHash)
        if (approveReceipt.status !== 'success') throw new Error(`${symbol} approval transaction failed.`)
        await waitForEscrowAllowance(payoutToken, orgAddress, escrowDeployment.escrowAddress, amountWei, decimals, symbol)
      } else {
        showToast(`${symbol} spending limit already covers this amount. Funding escrow next...`, 'info')
      }

      setStep('funding')
      await simulateEscrowFunding(escrowDeployment.escrowAddress, orgAddress, amountWei, symbol)
      showToast('Confirm the funding transaction to move USDC into escrow.', 'info')

      let fundingHash: Hex
      try {
        fundingHash = await writeContractAsync({
          address: escrowDeployment.escrowAddress,
          abi: REWARD_ESCROW_ABI,
          functionName: 'fundProgram',
          args: [amountWei],
          gas: 150000n,
        })
      } catch (error) {
        throw new Error(`Escrow funding transaction failed. ${getErrorMessage(error)}`)
      }
      setTxHash(fundingHash)
      const fundingReceipt = await waitForReceipt(fundingHash)
      if (fundingReceipt.status !== 'success') throw new Error('Escrow funding transaction failed on-chain.')

      setStep('registering')
      await registerProgramEscrow(
        escrowDeployment.escrowAddress,
        payoutToken,
        escrowDeployment.deployTxHash,
        approveHash,
        fundingHash,
      )

      setStep('activating')
      const fundRes = await api.post(`/programs/${programId}/fund`, {
        amount: Math.round(amount),
        escrowAddress: escrowDeployment.escrowAddress,
        fundingTxHash: fundingHash,
        ...(approveHash ? { approvalTxHash: approveHash } : {}),
      })
      if (!fundRes.success) {
        throw new Error(fundRes.error || 'Failed to activate program')
      }

      showToast('Program funded, escrow saved, and bounty activated!', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Funding failed:', error)
      showToast(getErrorMessage(error), 'error')
    } finally {
      setProcessing(false)
      setStep('idle')
    }
  }

  const stepLabel: Record<FundingStep, string> = {
    idle: '',
    syncing: 'Saving wallet...',
    checking: 'Checking escrow contract...',
    deploying: 'Deploying escrow contract...',
    approving: 'Approving USDC spend...',
    funding: 'Funding escrow...',
    registering: 'Saving funded escrow...',
    activating: 'Activating bounty...',
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

              <h2 className="text-2xl font-serif text-[var(--text)]">Fund & Activate</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
                Connect MetaMask, deploy or reuse your Base Sepolia escrow, fund it with USDC, and publish the bounty.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="field-label mb-1">Organization wallet</p>
                      <p className="text-xs text-[var(--text-soft)]">{isConnected ? formatAddress(address) : 'Connect MetaMask to continue'}</p>
                    </div>
                    <ConnectWalletButton compact />
                  </div>
                </div>

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

                <div>
                  <label className="field-label block mb-2 text-[var(--text-muted)] text-xs uppercase tracking-wider font-bold">Payout Token</label>
                  <select
                    value={tokenAddress}
                    onChange={(event) => setTokenAddress(event.target.value)}
                    className="field w-full"
                    disabled={processing}
                    required
                  >
                    <option value={defaultToken}>Mock USDC (Base Sepolia)</option>
                    {tokenAddress && tokenAddress !== defaultToken && (
                      <option value={tokenAddress}>Existing escrow token ({formatAddress(tokenAddress)})</option>
                    )}
                  </select>
                </div>

                <div className="space-y-2 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 text-xs text-[var(--text-soft)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Escrow</span>
                    <span className="font-mono text-[var(--text)]">{formatAddress(escrowAddress)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Reward factory</span>
                    <span className="font-mono text-[var(--text)]">
                      {isAddress(configuredFactoryAddress) ? formatAddress(configuredFactoryAddress) : 'Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Network</span>
                    <span className="text-[var(--text)]">Base Sepolia</span>
                  </div>
                  {txHash && (
                    <a
                      href={`${blockExplorer}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-mono text-[var(--accent)] hover:underline"
                    >
                      View transaction →
                    </a>
                  )}
                </div>

                {step !== 'idle' && (
                  <div className="rounded-[14px] border border-[rgba(15,202,138,0.16)] bg-[rgba(15,202,138,0.06)] px-4 py-3 text-xs font-semibold text-[var(--accent)]">
                    <span className="animate-pulse">{stepLabel[step]}</span>
                  </div>
                )}

                <div className="pt-4 flex w-full flex-col gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={processing || !isConnected}
                  >
                    {processing ? stepLabel[step] || 'Processing...' : 'Deploy, Fund & Activate'}
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
