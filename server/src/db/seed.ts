/**
 * Seed script — populates the database from the frontend platformMock data.
 * Run: bun run db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Seed data derived from platformMock.ts ───────────────────────────────────

const agents = [
    {
        id: 'atlas-triage-agent',
        name: 'Atlas Triage Agent',
        accentTone: 'mint',
        logoMark: 'AT',
        rank: 1,
        score: 97.4,
        minerName: 'Atlas Labs',
        validatorScore: 96.1,
        headline: 'Canonical intake, deduplication, and severity classification for bridge findings.',
        summary:
            'Atlas Triage Agent handles inbound report normalization, fingerprint-based deduplication, and initial severity proposals for smart contract and bridge programs.',
        capabilities: [
            'Report normalization', 'Duplicate fingerprinting', 'Severity classification',
            'Source-chain detection', 'Program-fit validation',
        ],
        supportedTechnologies: ['Solidity', 'TypeScript', 'EVM trace'],
        guardrails: [
            'Never finalizes severity — only proposes candidates for human review.',
            'Auto-escalates when asset loss evidence is present.',
            'All triage decisions are reviewable through the queue.',
        ],
        supportedSurfaces: ['SMART_CONTRACT', 'BLOCKCHAIN'] as const,
        metrics: [
            { label: 'Reports processed', value: '2,407', note: 'Since launch in Q1 2026' },
            { label: 'Duplicate detection rate', value: '91%', note: 'Confirmed by human reviewers' },
            { label: 'Severity alignment', value: '88%', note: 'Matches final reviewer outcome' },
        ],
        tools: [
            { name: 'Replay harness', access: 'Read-only', useCase: 'Executes sandboxed PoC replays against sanctioned fork.' },
            { name: 'Fingerprint DB', access: 'Read-write', useCase: 'Checks and stores exploit fingerprints for dedup.' },
            { name: 'Chain index', access: 'Read-only', useCase: 'Resolves contract addresses and deployment lineage.' },
        ],
        runtimeFlow: [
            {
                order: 0, title: 'Report ingestion',
                description: 'Parses the structured submission envelope and extracts program fit signals.',
                outputs: ['Program fit score', 'Surface classification', 'Field validation errors'],
                humanGate: undefined,
            },
            {
                order: 1, title: 'Fingerprint check',
                description: 'Generates a stable exploit fingerprint and queries the dedup index.',
                outputs: ['Duplicate candidates', 'Fingerprint hash', 'Confidence delta'],
                humanGate: 'Reviewer confirms duplicate closure when fingerprint similarity exceeds threshold.',
            },
            {
                order: 2, title: 'Severity proposal',
                description: 'Scores the business impact, exploitability, and blast radius to produce a severity band.',
                outputs: ['Severity band', 'Impact evidence map', 'Escalation flag'],
                humanGate: 'All severity proposals above Medium require lead-reviewer confirmation.',
            },
        ],
        outputSchema: [
            { name: 'finding_envelope', type: 'JSON', description: 'Normalized report with severity proposal and routing decision.' },
            { name: 'fingerprint_hash', type: 'string', description: 'Stable dedup key for the exploit path.' },
            { name: 'duplicate_cluster', type: 'string[]', description: 'IDs of related reports sharing the same root cause.' },
        ],
        recentExecutions: [
            { programId: 'atlas-bridge-smart-contracts', title: 'BR-1842 triage', status: 'Completed', summary: 'Critical confirmed — replay matched loss path.', timestamp: new Date('2026-04-01T14:25:00Z') },
            { programId: 'nebula-wallet-web-mobile', title: 'NW-441 classification', status: 'Completed', summary: 'High severity confirmed — recovery nonce drift.', timestamp: new Date('2026-03-31T18:10:00Z') },
        ],
    },
    {
        id: 'meridian-source-agent',
        name: 'Meridian Source Agent',
        accentTone: 'violet',
        logoMark: 'MS',
        rank: 2,
        score: 94.2,
        minerName: 'Meridian Labs',
        validatorScore: 93.8,
        headline: 'Contract provenance, deployment lineage, and source-truth linking.',
        summary:
            'Meridian Source Agent resolves contract addresses, GitHub refs, and deployment histories to attach verified provenance metadata to every finding.',
        capabilities: [
            'Contract address resolution', 'GitHub repo and org enrichment',
            'Deployment provenance tracing', 'Chain + token metadata attachment',
        ],
        supportedTechnologies: ['Solidity', 'Rust', 'Move', 'EVM', 'SVM'],
        guardrails: [
            'Never modifies on-chain state — read-only chain access only.',
            'Opens provenance exceptions when target is unverified or out-of-scope.',
        ],
        supportedSurfaces: ['SMART_CONTRACT', 'BLOCKCHAIN', 'WEB'] as const,
        metrics: [
            { label: 'Sources resolved', value: '4,812', note: 'Across all linked programs' },
            { label: 'Provenance accuracy', value: '97%', note: 'Verified against on-chain deployment' },
        ],
        tools: [
            { name: 'Etherscan API', access: 'Read-only', useCase: 'Resolves contract source code and deployment tx.' },
            { name: 'GitHub API', access: 'Read-only', useCase: 'Maps repo refs, commit hashes, and org ownership.' },
        ],
        runtimeFlow: [
            { order: 0, title: 'Target detection', description: 'Detects addresses, GitHub refs, and labels in the report envelope.', outputs: ['Target list', 'Reference kind classification'], humanGate: undefined },
            { order: 1, title: 'Provenance resolution', description: 'Fetches deployment tx, source-code match, and ownership docs.', outputs: ['Deployment lineage', 'Verified source map'], humanGate: 'Manual validation if target is outside announced scope.' },
        ],
        outputSchema: [
            { name: 'source_map', type: 'JSON', description: 'Verified mapping of target labels to on-chain addresses and GitHub refs.' },
            { name: 'provenance_score', type: 'number', description: 'Confidence score for the resolved provenance chain.' },
        ],
        recentExecutions: [
            { programId: 'atlas-bridge-smart-contracts', title: 'BR-1829 source enrichment', status: 'Completed', summary: 'Resolved contract address to verified Atlas Labs repo.', timestamp: new Date('2026-03-31T21:00:00Z') },
        ],
    },
    {
        id: 'oracle-dispute-agent',
        name: 'Oracle Dispute Agent',
        accentTone: 'orange',
        logoMark: 'OD',
        rank: 3,
        score: 91.7,
        minerName: 'Oracle Labs',
        validatorScore: 90.5,
        headline: 'Surfaces disagreements between autonomous triage and reviewer decisions.',
        summary:
            'Oracle Dispute Agent packages disagreement events between AI triage output and human reviewer decisions into structured briefs with analog incident references.',
        capabilities: ['Disagreement detection', 'Analog incident retrieval', 'Confidence delta scoring', 'Dispute brief generation'],
        supportedTechnologies: ['TypeScript', 'Solidity', 'Rust'],
        guardrails: ['Never changes severity unilaterally.', 'All dispute briefs require lead reviewer sign-off.'],
        supportedSurfaces: ['SMART_CONTRACT', 'BLOCKCHAIN', 'WEB', 'APPS'] as const,
        metrics: [
            { label: 'Disputes resolved', value: '318', note: 'Across all programs' },
            { label: 'Brief acceptance rate', value: '79%', note: 'Lead reviewer agrees with final brief' },
        ],
        tools: [
            { name: 'Incident DB', access: 'Read-only', useCase: 'Retrieves analog historical incidents for context.' },
        ],
        runtimeFlow: [
            { order: 0, title: 'Disagreement detection', description: 'Identifies classification mismatches between agent output and reviewer decision.', outputs: ['Delta log', 'Trigger event'], humanGate: undefined },
            { order: 1, title: 'Brief generation', description: 'Builds a structured dispute brief with analog incidents and confidence deltas.', outputs: ['Dispute brief', 'Analog set', 'Reviewer prompt'], humanGate: 'Lead reviewer confirms any classification change.' },
        ],
        outputSchema: [
            { name: 'dispute_brief', type: 'JSON', description: 'Structured disagreement summary with analog incidents and confidence deltas.' },
        ],
        recentExecutions: [
            { programId: 'atlas-bridge-smart-contracts', title: 'BR-1838 dispute review', status: 'Completed', summary: 'Reviewer marked as potentially distinct — brief accepted.', timestamp: new Date('2026-04-01T09:15:00Z') },
        ],
    },
    {
        id: 'forge-taxonomy-agent',
        name: 'Forge Taxonomy Agent',
        accentTone: 'rose',
        logoMark: 'FT',
        rank: 4,
        score: 88.9,
        minerName: 'Forge Research',
        validatorScore: 87.2,
        headline: 'Drafts new taxonomy entries for emerging vulnerability classes.',
        summary:
            'Forge Taxonomy Agent identifies findings that do not map to existing vulnerability classes and drafts novel category proposals with benchmark candidate sets.',
        capabilities: ['Novel class detection', 'Taxonomy draft generation', 'Benchmark candidate selection'],
        supportedTechnologies: ['Solidity', 'Rust', 'TypeScript', 'Move'],
        guardrails: ['Taxonomy drafts are proposals only — all additions require reviewer approval.'],
        supportedSurfaces: ['SMART_CONTRACT', 'BLOCKCHAIN'] as const,
        metrics: [
            { label: 'Taxonomy entries proposed', value: '47', note: 'Since launch' },
            { label: 'Accepted proposals', value: '31', note: 'Approved by research committee' },
        ],
        tools: [
            { name: 'Taxonomy DB', access: 'Read-write', useCase: 'Queries and proposes entries for the vulnerability taxonomy.' },
        ],
        runtimeFlow: [
            { order: 0, title: 'Class mapping', description: 'Attempts to match the finding to existing taxonomy entries.', outputs: ['Match confidence', 'Closest existing class'], humanGate: undefined },
            { order: 1, title: 'Draft generation', description: 'If no match, drafts a new taxonomy entry with examples and benchmark candidates.', outputs: ['Proposed entry', 'Benchmark candidate set'], humanGate: 'Research committee reviews all new taxonomy proposals.' },
        ],
        outputSchema: [
            { name: 'taxonomy_proposal', type: 'JSON', description: 'Proposed taxonomy entry with description, examples, and benchmark candidates.' },
        ],
        recentExecutions: [
            { programId: 'openledger-treasury-guard', title: 'OG-214 taxonomy mapping', status: 'Completed', summary: 'Proposed new class: agent-draft approval inheritance failure.', timestamp: new Date('2026-03-29T16:30:00Z') },
        ],
    },
]

const programs = [
    {
        id: 'atlas-bridge-smart-contracts',
        code: 'AP-1021',
        name: 'Atlas Bridge Smart Contracts',
        company: 'Atlas Labs',
        kind: 'BUG_BOUNTY' as const,
        tagline: 'Cross-chain settlement contracts for canonical asset routing.',
        description: 'Atlas Bridge secures token movement across Ethereum, Arbitrum, and Base using watcher-backed finality checks, treasury-governed pauses, and deterministic settlement envelopes.',
        accentTone: 'mint',
        logoMark: 'AB',
        isNew: true,
        triagedLabel: 'Triaged by AuditPal AI + Human Ops',
        maxBountyUsd: 250000,
        paidUsd: 42500,
        scopeReviews: 18420,
        startedAt: new Date('2026-03-14'),
        reputationRequired: 150,
        pocRequired: true,
        liveMessage: 'Live program is active now',
        responseSla: '12 hours to first triage touch',
        payoutCurrency: 'USDC',
        payoutWindow: '5 business days after acceptance',
        duplicatePolicy: 'First valid report wins by default. Shared reward applies when a later report proves a materially different exploitation path.',
        disclosureModel: 'Coordinated disclosure only after patch release and bridge relayer retest.',
        categories: ['SMART_CONTRACT', 'BLOCKCHAIN'] as const,
        platforms: ['ETHEREUM', 'ARBITRUM', 'BASE'] as const,
        languages: ['SOLIDITY', 'TYPESCRIPT'] as const,
        summaryHighlights: [
            'Bridge routers, settlement inboxes, relayer signatures, and emergency pause modules are all in scope.',
            'Every report enters a replay-first triage path before severity or duplicate decisions are finalized.',
            'Agent output is advisory until exploitability, provenance, and impact are confirmed by policy gates.',
        ],
        submissionChecklist: [
            'Attach a clear exploit narrative with chain, target, block height, and expected business impact.',
            'Provide replayable steps or a PoC that can run on the sanctioned fork environment.',
            'List the exact contracts, wallets, or services touched by the exploit path.',
        ],
        rewardTiers: [
            { severity: 'CRITICAL' as const, maxRewardUsd: 250000, triageSla: '6 h', payoutWindow: '5 business days', examples: ['Direct asset loss', 'Permanent insolvency', 'Unauthorized governance execution'] },
            { severity: 'HIGH' as const, maxRewardUsd: 75000, triageSla: '12 h', payoutWindow: '7 business days', examples: ['Privilege escalation', 'Bridge accounting drift', 'Cross-chain message forgery'] },
            { severity: 'MEDIUM' as const, maxRewardUsd: 15000, triageSla: '24 h', payoutWindow: '10 business days', examples: ['User fund lockup', 'Keeper manipulation with bounded impact', 'State corruption'] },
            { severity: 'LOW' as const, maxRewardUsd: 3000, triageSla: '72 h', payoutWindow: 'Discretionary', examples: ['Limited edge case', 'Visibility issue with security impact', 'Defense in depth weakness'] },
        ],
        scopeTargets: [
            { label: 'BridgeRouter deployment', location: 'Ethereum / contracts/core/BridgeRouter.sol', assetType: 'Smart Contract', severity: 'CRITICAL' as const, reviewStatus: 'Verified source and live deployment', referenceKind: 'CONTRACT_ADDRESS' as const, referenceValue: '0x4D7A9e7b6fA2dA11aA2b3e4C5D6eF7089A12bC34', referenceUrl: 'https://etherscan.io/address/0x4D7A9e7b6fA2dA11aA2b3e4C5D6eF7089A12bC34', network: 'Ethereum', environment: 'MAINNET' as const, tags: ['Bridge core', 'Router'], note: 'Handles deposit accounting, fee paths, and outbound route authorization.' },
            { label: 'FinalityInbox canary deployment', location: 'Arbitrum / contracts/settlement/FinalityInbox.sol', assetType: 'Smart Contract', severity: 'CRITICAL' as const, reviewStatus: 'Verified source and replay fixture coverage', referenceKind: 'CONTRACT_ADDRESS' as const, referenceValue: '0x1A72c5E0c2f3CefA18D4a08d4D2aa27BbC9038F2', network: 'Arbitrum Sepolia', environment: 'TESTNET' as const, tags: ['Settlement', 'Watcher finality'], note: 'Accepts watcher attestations and final settlement release messages.' },
            { label: 'Bridge relayer repository', location: 'Offchain / relayer/watchtower', assetType: 'Infrastructure', severity: 'HIGH' as const, reviewStatus: 'Private deployment with signed fixture replay', referenceKind: 'GITHUB_REPO' as const, referenceValue: 'github.com/atlas-labs/bridge-relayer', referenceUrl: 'https://github.com/atlas-labs/bridge-relayer', environment: 'PRODUCTION' as const, tags: ['GitHub scope', 'Offchain workers'], note: 'Queue workers that sign and transmit relay payloads to supported chains.' },
        ],
        triageStages: [
            { order: 0, title: 'Canonical intake envelope', owner: 'Atlas Triage Agent', automation: 'Autonomous', trigger: 'Report is submitted with PoC, transaction hash, or repo reference.', outputs: ['Program fit validation', 'Duplicate fingerprint', 'Initial severity proposal'], humanGate: 'Escalate immediately when asset loss evidence or scope fit is ambiguous.' },
            { order: 1, title: 'Replay sandbox', owner: 'Atlas replay worker', automation: 'Hybrid AI', trigger: 'PoC or deterministic exploit steps are attached.', outputs: ['Replay bundle hash', 'State diff snapshot', 'Affected asset inventory'], humanGate: 'Manual analyst review is required if the replay diverges from the reported chain state.' },
            { order: 2, title: 'Reward committee gate', owner: 'Lead reviewer', automation: 'Human', trigger: 'Exploitability, severity, and duplicate path are all populated.', outputs: ['Payout recommendation', 'Remediation priority', 'Disclosure timer'], humanGate: 'Always human. Any payout-impacting decision requires reviewer sign-off.' },
        ],
        policySections: [
            { order: 0, title: 'Focus Area', items: ['Direct theft or loss of user funds bridged through Atlas routes.', 'Unauthorized execution of settlement, mint, or release flows.', 'Accounting drift that makes the bridge insolvent or blocks valid exits.'] },
            { order: 1, title: 'Out Of Scope', items: ['Reports that only note gas usage, style issues, or missing comments.', 'Assumptions requiring compromised multisig keys or social engineering.', 'Findings in third-party contracts not owned or deployed by Atlas Labs.'] },
            { order: 2, title: 'Program Rules', items: ['Testing must stay within the published contracts, relayer fixtures, and sandbox runbooks.', 'Traffic amplification or public chain griefing is not allowed during testing.', 'Any exploit touching live assets must stop at the minimum proof needed for validation.'] },
            { order: 3, title: 'Disclosure Guidelines', items: ['No public disclosure is allowed until the program owner and triage team mark the ticket as public.', 'All report communication must stay inside the platform ticket and evidence bundle.'] },
            { order: 4, title: 'Eligibility And Coordinated Disclosure', items: ['The report must be the first valid submission for the root cause.', 'A reproducible proof or sanctioned replay steps are required for any payout-eligible finding.', 'The researcher must report within 24 hours of discovery.'] },
        ],
        evidenceFields: [
            { name: 'exploit_fingerprint', description: 'Stable dedup key derived from target, state transition, and asset movement path.' },
            { name: 'replay_bundle_hash', description: 'Hash of the sandboxed replay environment, calldata, fork block, and result trace.' },
        ],
        linkedAgentIds: ['atlas-triage-agent', 'meridian-source-agent', 'oracle-dispute-agent'],
    },
    {
        id: 'nebula-wallet-web-mobile',
        code: 'NW-2048',
        name: 'Nebula Wallet Web & Mobile',
        company: 'Nebula Security',
        kind: 'BUG_BOUNTY' as const,
        tagline: 'Consumer wallet surfaces with simulation, signing, and recovery logic.',
        description: 'Nebula Wallet includes browser, iOS, and Android clients with transaction simulation, hardware-wallet handoff, passkeys, and emergency social recovery.',
        accentTone: 'blue',
        logoMark: 'NW',
        isNew: true,
        triagedLabel: 'Triaged by AuditPal AI + Human Ops',
        maxBountyUsd: 30000,
        paidUsd: 8800,
        scopeReviews: 9214,
        startedAt: new Date('2026-03-20'),
        reputationRequired: 100,
        pocRequired: true,
        liveMessage: 'Live program is active now',
        responseSla: '18 hours to first triage touch',
        payoutCurrency: 'USDC',
        payoutWindow: '7 business days after acceptance',
        duplicatePolicy: 'First reproducible report wins. Follow-up submissions may receive recognition if they materially widen the impact envelope.',
        disclosureModel: 'Coordinated disclosure after app store release or hotfix publication.',
        categories: ['WEB', 'APPS'] as const,
        platforms: ['ETHEREUM', 'SOLANA', 'OFFCHAIN'] as const,
        languages: ['TYPESCRIPT', 'SWIFT'] as const,
        summaryHighlights: [
            'Wallet signing, transaction simulation, QR import flows, and recovery approvals are in scope.',
            'AI triage highlights auth, signature-domain, and recovery-policy anomalies before analyst review.',
        ],
        submissionChecklist: [
            'Specify the exact build version, device type, and wallet state required to reproduce the issue.',
            'Attach screen capture or transaction payload diff when the issue affects signing or simulation.',
        ],
        rewardTiers: [
            { severity: 'CRITICAL' as const, maxRewardUsd: 30000, triageSla: '6 h', payoutWindow: '5 business days', examples: ['Seed phrase leakage', 'Signing bypass', 'Recovery quorum break'] },
            { severity: 'HIGH' as const, maxRewardUsd: 12000, triageSla: '12 h', payoutWindow: '7 business days', examples: ['Biometric bypass', 'Session replay', 'Simulation mismatch'] },
            { severity: 'MEDIUM' as const, maxRewardUsd: 3500, triageSla: '24 h', payoutWindow: '10 business days', examples: ['UI misleading amounts', 'Minor auth gap'] },
            { severity: 'LOW' as const, maxRewardUsd: 750, triageSla: '72 h', payoutWindow: 'Discretionary', examples: ['Limited UX issue with security edge'] },
        ],
        scopeTargets: [
            { label: 'Wallet web client', location: 'Offchain / apps/web-wallet', assetType: 'Web app', severity: 'HIGH' as const, reviewStatus: 'Production build and staging env', referenceKind: 'GITHUB_REPO' as const, referenceValue: 'github.com/nebula-security/wallet-web', referenceUrl: 'https://github.com/nebula-security/wallet-web', environment: 'PRODUCTION' as const, tags: ['Browser wallet', 'Frontend'], note: 'Signing orchestration, passkey login, simulation display.' },
            { label: 'iOS signing module', location: 'iOS / mobile/signing-core', assetType: 'Mobile app', severity: 'CRITICAL' as const, reviewStatus: 'Release candidate with debug telemetry disabled', referenceKind: 'GITHUB_REPO' as const, referenceValue: 'github.com/nebula-security/mobile-wallet', environment: 'AUDIT' as const, tags: ['Mobile signing', 'iOS'], note: 'Local key handling, biometric gate, and social recovery co-sign checks.' },
        ],
        triageStages: [
            { order: 0, title: 'Wallet report normalization', owner: 'Atlas Triage Agent', automation: 'Autonomous', trigger: 'Submission includes app build, transaction request, or auth path details.', outputs: ['Surface classification', 'Device-specific routing', 'Duplicate cluster'], humanGate: 'Escalate when the exploit depends on a mobile-only state the sandbox cannot reproduce.' },
            { order: 1, title: 'Payout gate', owner: 'Wallet security lead', automation: 'Human', trigger: 'Replay, surface ownership, and impact evidence are complete.', outputs: ['Severity confirmation', 'Bounty decision', 'Fix owner and release note'], humanGate: 'Always human.' },
        ],
        policySections: [
            { order: 0, title: 'Focus Area', items: ['Unauthorized signing, recovery abuse, or user-consent bypass.', 'Seed, private-key, or guardian-secret leakage.'] },
            { order: 1, title: 'Out Of Scope', items: ['Rooted-device assumptions without a realistic user path.', 'General UI bugs without a security consequence.'] },
            { order: 2, title: 'Program Rules', items: ['Use only test wallets or sanctioned fixtures during validation.', 'Do not attempt to compromise other user accounts or live production wallets.'] },
            { order: 3, title: 'Disclosure Guidelines', items: ['No public disclosure is allowed until the program owner and triage team mark the ticket as public.'] },
            { order: 4, title: 'Eligibility And Coordinated Disclosure', items: ['The report must be the first valid submission for the root cause.', 'A reproducible proof is required for any payout-eligible finding.'] },
        ],
        evidenceFields: [
            { name: 'session_trace_id', description: 'Signed trace of prompts, device state, and action approvals generated by the replay worker.' },
            { name: 'build_fingerprint', description: 'Release build identifier used to tie the report to a shipped client version.' },
        ],
        linkedAgentIds: ['atlas-triage-agent', 'meridian-source-agent'],
    },
    {
        id: 'openledger-treasury-guard',
        code: 'OG-3310',
        name: 'OpenLedger Treasury Guard',
        company: 'OpenLedger',
        kind: 'BUG_BOUNTY' as const,
        tagline: 'Treasury automation with human approvals and agent-assisted execution.',
        description: 'OpenLedger manages DAO treasury disbursements through scheduled proposals, risk checks, and an agent-assisted approval layer that can draft but never finalize fund movement.',
        accentTone: 'ink',
        logoMark: 'OG',
        isNew: false,
        triagedLabel: 'Triaged by AuditPal AI + Human Ops',
        maxBountyUsd: 150000,
        paidUsd: 22400,
        scopeReviews: 12608,
        startedAt: new Date('2026-02-28'),
        reputationRequired: 120,
        pocRequired: true,
        liveMessage: 'Live program is active now',
        responseSla: '10 hours to first triage touch',
        payoutCurrency: 'USDC',
        payoutWindow: '5 business days after acceptance',
        duplicatePolicy: 'Root-cause duplicates are merged. Distinct control-plane bypasses may qualify independently if exploit conditions differ.',
        disclosureModel: 'Coordinated disclosure after governor patch, signer migration, and monitoring validation.',
        categories: ['SMART_CONTRACT', 'BLOCKCHAIN', 'APPS'] as const,
        platforms: ['BASE', 'ETHEREUM', 'OFFCHAIN'] as const,
        languages: ['SOLIDITY', 'TYPESCRIPT'] as const,
        summaryHighlights: [
            'The mocked product focuses on the risk of agent-assisted treasury workflows rather than allowing agents to move funds autonomously.',
            'Human override remains mandatory for any payment-impacting action.',
        ],
        submissionChecklist: [
            'Show the full action path from draft generation to signer approval to treasury execution.',
            'Explain which human or policy gate should have stopped the action and why it failed.',
        ],
        rewardTiers: [
            { severity: 'CRITICAL' as const, maxRewardUsd: 150000, triageSla: '6 h', payoutWindow: '5 business days', examples: ['Signer bypass', 'Unauthorized treasury transfer', 'Allowance escalation'] },
            { severity: 'HIGH' as const, maxRewardUsd: 50000, triageSla: '12 h', payoutWindow: '7 business days', examples: ['Policy evaluation failure', 'Agent output manipulation'] },
            { severity: 'MEDIUM' as const, maxRewardUsd: 12000, triageSla: '24 h', payoutWindow: '10 business days', examples: ['Proposal integrity issues', 'Race condition in approvals'] },
            { severity: 'LOW' as const, maxRewardUsd: 2500, triageSla: '72 h', payoutWindow: 'Discretionary', examples: ['Minor audit log gap'] },
        ],
        scopeTargets: [
            { label: 'TreasuryGovernor deployment', location: 'Base / contracts/governance/TreasuryGovernor.sol', assetType: 'Smart Contract', severity: 'CRITICAL' as const, reviewStatus: 'Verified source and fork replay ready', referenceKind: 'CONTRACT_ADDRESS' as const, referenceValue: '0x801ad3167d1578d5A7c9c3cA1207b57d04cA2b5f', referenceUrl: 'https://basescan.org/address/0x801ad3167d1578d5A7c9c3cA1207b57d04cA2b5f', network: 'Base', environment: 'MAINNET' as const, tags: ['Treasury', 'Governor'], note: 'Final execution gate for batched treasury proposals and allowance changes.' },
        ],
        triageStages: [
            { order: 0, title: 'Policy-aware intake', owner: 'Atlas Triage Agent', automation: 'Autonomous', trigger: 'Submission references governance execution, allowance changes, or signer bypass.', outputs: ['Control plane classification', 'Impact path map', 'Duplicate candidates'], humanGate: 'Escalate when the issue can influence treasury movement or signer quorum.' },
        ],
        policySections: [
            { order: 0, title: 'Focus Area', items: ['Unauthorized transfer, signer bypass, or allowance escalation affecting treasury assets.', 'Control-plane bugs where agent output materially changes what humans approve.'] },
            { order: 1, title: 'Out Of Scope', items: ['Purely theoretical concerns without a realistic execution or approval path.', 'General dashboard UX issues without a security outcome.'] },
            { order: 2, title: 'Program Rules', items: ['No testing on live treasury balances. Use fixtures, replay environments, and sandbox wallets only.'] },
            { order: 3, title: 'Disclosure Guidelines', items: ['No public disclosure is allowed until the program owner and triage team mark the ticket as public.'] },
            { order: 4, title: 'Eligibility And Coordinated Disclosure', items: ['The report must be the first valid submission for the root cause.'] },
        ],
        evidenceFields: [
            { name: 'proposal_hash', description: 'Stable identifier of the treasury action bundle under review.' },
            { name: 'approval_lineage', description: 'Timeline of agent draft, human approval, signer envelope, and final execution context.' },
        ],
        linkedAgentIds: ['atlas-triage-agent', 'oracle-dispute-agent', 'forge-taxonomy-agent'],
    },
]

// ─── Main seed function ────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Seeding database...')

    // 1. Upsert agents
    console.log('   → Seeding agents...')
    for (const a of agents) {
        const { metrics, tools, runtimeFlow, outputSchema, recentExecutions, ...agentData } = a

        await prisma.agent.upsert({
            where: { id: agentData.id },
            update: {},
            create: {
                ...agentData,
                supportedSurfaces: [...agentData.supportedSurfaces],
                metrics: { create: metrics },
                tools: { create: tools },
                runtimeFlow: { create: runtimeFlow },
                outputSchema: { create: outputSchema },
                recentExecutions: { create: recentExecutions },
            },
        })
    }

    // 2. Upsert programs
    console.log('   → Seeding programs...')
    for (const p of programs) {
        const {
            rewardTiers, scopeTargets, triageStages, policySections, evidenceFields,
            linkedAgentIds, ...programData
        } = p

        await prisma.program.upsert({
            where: { id: programData.id },
            update: {},
            create: {
                ...programData,
                categories: [...programData.categories],
                platforms: [...programData.platforms],
                languages: [...programData.languages],
                rewardTiers: { create: rewardTiers },
                scopeTargets: { create: scopeTargets },
                triageStages: { create: triageStages },
                policySections: { create: policySections },
                evidenceFields: { create: evidenceFields },
                linkedAgents: {
                    create: linkedAgentIds.map((agentId) => {
                        const a = agents.find((ag) => ag.id === agentId)!
                        return {
                            agentId,
                            purpose: `${a.name} — linked to ${programData.name}`,
                            trigger: 'Runs automatically on relevant events.',
                            output: 'Advisory output routed to human reviewer.',
                        }
                    }),
                },
            },
        })
    }

    // 3. Create an admin user if not present
    console.log('   → Seeding admin user...')
    await prisma.user.upsert({
        where: { email: 'admin@auditpal.io' },
        update: {
            passwordHash: await Bun.password.hash('Admin1234!'),
            name: 'AuditPal Admin',
            role: 'ADMIN',
            reputation: 9999,
        },
        create: {
            email: 'admin@auditpal.io',
            passwordHash: await Bun.password.hash('Admin1234!'),
            name: 'AuditPal Admin',
            role: 'ADMIN',
            reputation: 9999,
        },
    })

    console.log('   → Seeding demo users...')
    await prisma.user.upsert({
        where: { email: 'hunter@auditpal.io' },
        update: {
            passwordHash: await Bun.password.hash('Hunter1234!'),
            name: 'Demo Bounty Hunter',
            role: 'BOUNTY_HUNTER',
            reputation: 420,
            organizationName: null,
        },
        create: {
            email: 'hunter@auditpal.io',
            passwordHash: await Bun.password.hash('Hunter1234!'),
            name: 'Demo Bounty Hunter',
            role: 'BOUNTY_HUNTER',
            reputation: 420,
        },
    })

    const organizationUser = await prisma.user.upsert({
        where: { email: 'org@auditpal.io' },
        update: {
            passwordHash: await Bun.password.hash('Org1234!'),
            name: 'Atlas Validator',
            role: 'ORGANIZATION',
            organizationName: 'Atlas Labs',
            reputation: 1200,
        },
        create: {
            email: 'org@auditpal.io',
            passwordHash: await Bun.password.hash('Org1234!'),
            name: 'Atlas Validator',
            role: 'ORGANIZATION',
            organizationName: 'Atlas Labs',
            reputation: 1200,
        },
    })

    await prisma.program.updateMany({
        where: { ownerId: null },
        data: { ownerId: organizationUser.id },
    })

    console.log('✅ Seed complete.')
}

main()
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
    .finally(async () => prisma.$disconnect())
