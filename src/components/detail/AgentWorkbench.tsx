import { useState } from 'react'
import type { Agent, AgentLink, Program } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import { getScopeTargetSearchText } from '../../utils/scopeTargets'

interface LinkedProgramContext {
  program: Program
  link: AgentLink
}

interface AgentWorkbenchProps {
  agent: Agent
  linkedPrograms: readonly LinkedProgramContext[]
}

const categoryCatalog = [
  {
    id: 'smart-contracts',
    label: 'Smart Contracts',
    description: 'State transitions, accounting, access control, and upgrade safety.',
    keywords: ['contract', 'contracts', 'solidity', 'evm', 'token', 'bridge', 'defi', 'vault', 'governor'],
  },
  {
    id: 'business-logic',
    label: 'Business Logic',
    description: 'Incorrect flows, broken assumptions, and unsafe state coupling.',
    keywords: ['logic', 'settlement', 'liquidation', 'router', 'execution', 'batch'],
  },
  {
    id: 'access-control',
    label: 'Access Control',
    description: 'Roles, permissions, guardians, admin flows, and privileged paths.',
    keywords: ['auth', 'role', 'admin', 'guardian', 'permission', 'owner', 'access'],
  },
  {
    id: 'bridge-risk',
    label: 'Bridge Risk',
    description: 'Settlement, relayers, signature validation, and cross-chain drift.',
    keywords: ['bridge', 'relayer', 'watcher', 'finality', 'crosschain', 'cross-chain'],
  },
  {
    id: 'wallet-safety',
    label: 'Wallet Safety',
    description: 'Signing intent, recovery, consent, biometrics, and key handling.',
    keywords: ['wallet', 'sign', 'signer', 'recovery', 'passkey', 'seed', 'custody'],
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Treasury movement, proposal execution, and approval state.',
    keywords: ['governance', 'treasury', 'proposal', 'approval', 'multisig'],
  },
  {
    id: 'oracle-market',
    label: 'Oracle and Market',
    description: 'Pricing, keeper races, liquidation fairness, and fallback logic.',
    keywords: ['oracle', 'keeper', 'liquidation', 'market', 'price', 'margin'],
  },
  {
    id: 'identity-auth',
    label: 'Identity and Auth',
    description: 'Credential issuance, delegated access, auth, and policy checks.',
    keywords: ['identity', 'credential', 'delegate', 'access', 'policy', 'auth'],
  },
  {
    id: 'backend-infra',
    label: 'Backend and Infra',
    description: 'APIs, job runners, operational services, and replay prevention.',
    keywords: ['service', 'api', 'infra', 'backend', 'queue', 'scheduler', 'worker'],
  },
  {
    id: 'frontend-mobile',
    label: 'Frontend and Mobile',
    description: 'Client rendering, device-specific logic, and signing UX gaps.',
    keywords: ['web', 'frontend', 'mobile', 'ios', 'android', 'client', 'react', 'swift'],
  },
] as const

type CategoryId = (typeof categoryCatalog)[number]['id']

interface ParsedGitHubLink {
  kind: 'profile' | 'repo'
  owner: string
  repo?: string
  branch?: string
  path?: string
  href: string
  tokens: string[]
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
}

function parseGitHubLink(value: string): { parsed: ParsedGitHubLink | null; error: string } {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      parsed: null as ParsedGitHubLink | null,
      error: '',
    }
  }

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`

  try {
    const url = new URL(normalized)
    const host = url.hostname.replace(/^www\./, '')

    if (host !== 'github.com') {
      return {
        parsed: null,
        error: 'Use a GitHub profile or repository link.',
      }
    }

    const segments = url.pathname.split('/').filter(Boolean)

    if (segments.length === 0) {
      return {
        parsed: null,
        error: 'Paste a GitHub profile or repository URL.',
      }
    }

    const owner = segments[0]
    const repo = segments[1]?.replace(/\.git$/i, '')

    if (!repo) {
      return {
        parsed: {
          kind: 'profile',
          owner,
          href: `https://github.com/${owner}`,
          tokens: tokenize(owner),
        },
        error: '',
      }
    }

    let branch = ''
    let path = ''

    if ((segments[2] === 'tree' || segments[2] === 'blob') && segments[3]) {
      branch = segments[3]
      path = segments.slice(4).join('/')
    } else if (segments.length > 2) {
      path = segments.slice(2).join('/')
    }

    const tokens = tokenize([owner, repo, branch, path].filter(Boolean).join(' '))

    return {
      parsed: {
        kind: 'repo',
        owner,
        repo,
        branch: branch || undefined,
        path: path || undefined,
        href: `https://github.com/${owner}/${repo}${branch ? `/tree/${branch}` : ''}${path ? `/${path}` : ''}`,
        tokens,
      },
      error: '',
    }
  } catch {
    return {
      parsed: null,
      error: 'Paste a valid GitHub URL like github.com/org/repo or github.com/org/repo/tree/main/contracts.',
    }
  }
}

function agentDefaultCategories(agent: Agent): CategoryId[] {
  if (agent.id === 'atlas-triage-agent') {
    return ['smart-contracts', 'business-logic', 'access-control', 'bridge-risk']
  }

  if (agent.id === 'meridian-source-agent') {
    return ['backend-infra', 'smart-contracts', 'identity-auth']
  }

  if (agent.id === 'oracle-dispute-agent') {
    return ['business-logic', 'governance', 'oracle-market']
  }

  return ['smart-contracts', 'governance', 'oracle-market']
}

function inferSuggestedCategories(agent: Agent, parsed: ParsedGitHubLink | null): CategoryId[] {
  const picked = new Set<CategoryId>(agentDefaultCategories(agent))
  const tokenSet = new Set(parsed?.tokens || [])

  for (const category of categoryCatalog) {
    if (category.keywords.some((keyword) => tokenSet.has(keyword))) {
      picked.add(category.id)
    }
  }

  for (const surface of agent.supportedSurfaces || []) {
    if (surface === 'Smart Contract') {
      picked.add('smart-contracts')
    }
    if (surface === 'Web' || surface === 'Apps') {
      picked.add('frontend-mobile')
    }
    if (surface === 'Blockchain') {
      picked.add('business-logic')
    }
  }

  return categoryCatalog
    .map((category) => category.id)
    .filter((id) => picked.has(id))
}

function buildLeads(agent: Agent, parsed: ParsedGitHubLink | null, categories: readonly CategoryId[]) {
  const leads = new Set<string>()

  const leadMap: Record<CategoryId, readonly string[]> = {
    'smart-contracts': [
      'Check privileged role paths, pause controls, and upgrade restrictions.',
      'Trace accounting edges where storage updates can drift from token movement.',
    ],
    'business-logic': [
      'Review multi-step flows where one component assumes another already validated state.',
      'Look for broken invariants across retries, batching, or delayed settlement.',
    ],
    'access-control': [
      'Map every admin, guardian, and signer permission boundary.',
      'Test stale approvals, replayable permissions, and partial role revocation cases.',
    ],
    'bridge-risk': [
      'Inspect watcher signatures, message replay resistance, and finality assumptions.',
      'Compare inbound versus outbound accounting to catch solvency drift.',
    ],
    'wallet-safety': [
      'Check whether displayed intent can diverge from the actually signed payload.',
      'Review recovery, guardian rotation, and device-state edge cases.',
    ],
    governance: [
      'Inspect proposal state reuse, treasury approval lineage, and signer invalidation.',
      'Focus on whether agent- or draft-generated actions can inherit stale approvals.',
    ],
    'oracle-market': [
      'Stress fallback price logic, queue fairness, and liquidation ordering assumptions.',
      'Check whether stale market data widens economic impact or solvency drift.',
    ],
    'identity-auth': [
      'Review delegated access expiry, policy downgrade behavior, and credential revocation timing.',
      'Check whether auth context or role inheritance can outlive policy changes.',
    ],
    'backend-infra': [
      'Inspect job routing, replay prevention, queue ownership, and credential isolation.',
      'Look for state that can be re-used after config changes or failover.',
    ],
    'frontend-mobile': [
      'Look for client-only state mismatches between what the user sees and what the backend executes.',
      'Check mobile-specific flows where consent, recovery, or auth diverges from web behavior.',
    ],
  }

  for (const category of categories) {
    for (const lead of leadMap[category]) {
      leads.add(lead)
    }
  }

  if (agent.id === 'atlas-triage-agent' && categories.includes('smart-contracts')) {
    leads.add('Atlas is especially strong at bridge routers, settlement envelopes, and smart-contract replay requirements.')
  }

  if (agent.id === 'meridian-source-agent') {
    leads.add('Use Meridian to confirm whether the GitHub target is actually in scope before going deep on exploitability.')
  }

  if (parsed?.kind === 'profile') {
    leads.add('A GitHub profile is enough for org-level orientation, but a specific repo path will produce much sharper vulnerability guidance.')
  }

  return Array.from(leads).slice(0, 6)
}

function scoreProgram(program: Program, categories: readonly CategoryId[], tokens: readonly string[]) {
  const haystack = [
    program.name,
    program.company,
    program.tagline,
    program.description,
    ...program.categories,
    ...program.languages,
    ...program.projectTypes,
    ...program.platforms,
    ...program.scopeTargets.map((target) => getScopeTargetSearchText(target)),
  ]
    .join(' ')
    .toLowerCase()

  let score = 0

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  if (categories.includes('smart-contracts') && program.categories.includes('Smart Contract')) {
    score += 4
  }

  if (categories.includes('bridge-risk') && program.projectTypes.includes('Bridge')) {
    score += 5
  }

  if (categories.includes('wallet-safety') && program.projectTypes.includes('Wallet')) {
    score += 5
  }

  if (categories.includes('governance') && program.projectTypes.includes('Treasury')) {
    score += 4
  }

  if (categories.includes('oracle-market') && program.projectTypes.includes('Lending')) {
    score += 4
  }

  if (categories.includes('identity-auth') && program.projectTypes.includes('Identity')) {
    score += 4
  }

  if (categories.includes('backend-infra') && program.projectTypes.includes('Infrastructure')) {
    score += 3
  }

  return score
}

export function AgentWorkbench({ agent, linkedPrograms }: AgentWorkbenchProps) {
  const [githubLink, setGithubLink] = useState('')
  const [repoNotes, setRepoNotes] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([])
  const [analysisStarted, setAnalysisStarted] = useState(false)

  const { parsed, error } = parseGitHubLink(githubLink)
  const suggestedCategories = inferSuggestedCategories(agent, parsed)
  const activeCategories = selectedCategories.length > 0 ? selectedCategories : suggestedCategories.slice(0, 4)
  const activeCategoryDetails = categoryCatalog.filter((category) => activeCategories.includes(category.id))
  const vulnerabilityLeads = buildLeads(agent, parsed, activeCategories)
  const supportedTechnologies = agent.supportedTechnologies || []
  const recommendedPrograms = [...linkedPrograms]
    .map((entry) => ({
      ...entry,
      score: scoreProgram(entry.program, activeCategories, parsed?.tokens || []),
    }))
    .sort((left, right) => right.score - left.score || left.program.name.localeCompare(right.program.name))
    .slice(0, 3)

  const toggleCategory = (categoryId: CategoryId) => {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId],
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_340px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Agent intake</p>
            <h2 className="mt-4 font-serif text-4xl text-[#171717] md:text-5xl">
              Send a GitHub target into {agent.name}.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#4b463f]">
              Paste a GitHub profile or repository link, then click the categories you care about. The workbench will parse the link, infer likely surfaces, and prepare a vulnerability-oriented brief for this selected agent.
            </p>

            <div className="mt-6 grid gap-5">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">GitHub link</span>
                <input
                  type="text"
                  value={githubLink}
                  onChange={(event) => {
                    setGithubLink(event.target.value)
                    setAnalysisStarted(false)
                  }}
                  placeholder="https://github.com/org/repo/tree/main/contracts"
                  className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                />
                {error && <p className="text-sm text-[#9f3d28]">{error}</p>}
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Research note</span>
                <textarea
                  rows={4}
                  value={repoNotes}
                  onChange={(event) => {
                    setRepoNotes(event.target.value)
                    setAnalysisStarted(false)
                  }}
                  placeholder="Optional context: known attack surface, suspected component, or why this repo matters."
                  className="w-full rounded-[24px] border border-[#d9d1c4] bg-white px-4 py-3 text-sm leading-7 text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Suggested categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedCategories.map((categoryId) => {
                    const category = categoryCatalog.find((item) => item.id === categoryId)

                    if (!category) {
                      return null
                    }

                    const isSelected = selectedCategories.includes(category.id)

                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${isSelected
                          ? 'border-[#171717] bg-[#171717] text-white'
                          : 'border-[#d9d1c4] bg-white text-[#171717] hover:border-[#171717]'
                          }`}
                      >
                        {category.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">More categories if needed</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryCatalog.map((category) => {
                    const isSelected = activeCategories.includes(category.id)

                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${isSelected
                          ? 'border-[#315e50] bg-[#eef5f2] text-[#315e50]'
                          : 'border-[#d9d1c4] bg-[#fbf8f2] text-[#5f5a51] hover:border-[#171717] hover:text-[#171717]'
                          }`}
                      >
                        {category.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setAnalysisStarted(true)}
                disabled={Boolean(error) || githubLink.trim().length === 0}
              >
                Prepare analysis brief
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setSelectedCategories([])
                  setRepoNotes('')
                  setGithubLink('')
                  setAnalysisStarted(false)
                }}
              >
                Reset intake
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Agent fit</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(agent.supportedSurfaces || []).map((surface) => (
                  <Badge key={surface} tone="soft">
                    {surface}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {supportedTechnologies.map((technology) => (
                  <Badge key={technology} tone="accent">
                    {technology}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Parsed GitHub target</p>
              {parsed ? (
                <div className="mt-4 space-y-3 text-sm text-[#4b463f]">
                  <div className="rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Owner</p>
                    <p className="mt-2 text-[#171717]">{parsed.owner}</p>
                  </div>
                  <div className="rounded-[20px] border border-[#e6dfd3] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Scope</p>
                    <p className="mt-2 text-[#171717]">
                      {parsed.kind === 'repo' ? `${parsed.owner}/${parsed.repo}` : `${parsed.owner} profile`}
                    </p>
                    {parsed.branch && <p className="mt-2 text-[#5f5a51]">Branch: {parsed.branch}</p>}
                    {parsed.path && <p className="mt-1 text-[#5f5a51]">Path: {parsed.path}</p>}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#5f5a51]">
                  Paste a GitHub link and the workbench will break the target into owner, repository, branch, and path context before analysis starts.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>

      {analysisStarted && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Active investigation categories</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {activeCategoryDetails.map((category) => (
                  <div key={category.id} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-lg font-semibold text-[#171717]">{category.label}</p>
                    <p className="mt-3 text-sm leading-7 text-[#4b463f]">{category.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Vulnerability leads</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {vulnerabilityLeads.map((lead) => (
                  <div key={lead} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <p className="text-sm leading-7 text-[#4b463f]">{lead}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)] md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Best matching programs</p>
              <div className="mt-5 space-y-4">
                {recommendedPrograms.map(({ program, link, score }) => (
                  <div key={program.id} className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[#171717]">{program.name}</h3>
                        <p className="mt-1 text-sm text-[#6f695f]">{program.company} · {program.kind}</p>
                      </div>
                      <Badge tone={score > 0 ? 'accent' : 'soft'}>
                        {score > 0 ? `Match ${score}` : 'Context link'}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#4b463f]">{link.purpose}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {program.categories.map((category) => (
                        <Badge key={category} tone="soft">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
            <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Analysis brief</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#4b463f]">
                <p>
                  <span className="font-medium text-[#171717]">Target:</span>{' '}
                  {parsed
                    ? parsed.kind === 'repo'
                      ? `${parsed.owner}/${parsed.repo}${parsed.path ? ` · ${parsed.path}` : ''}`
                      : `${parsed.owner} GitHub profile`
                    : 'No parsed target'}
                </p>
                <p>
                  <span className="font-medium text-[#171717]">Agent role:</span> {agent.summary}
                </p>
                {repoNotes.trim() && (
                  <p>
                    <span className="font-medium text-[#171717]">Research note:</span> {repoNotes.trim()}
                  </p>
                )}
              </div>
            </section>

            {activeCategories.includes('smart-contracts') && (
              <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Smart contract lens</p>
                <p className="mt-4 text-sm leading-7 text-[#4b463f]">
                  This repo looks suitable for a contract-heavy pass. Atlas-style coverage should focus on access control, bridge settlement, accounting drift, replay resistance, and emergency controls first.
                </p>
              </section>
            )}

            {(agent.outputSchema || []).length > 0 && (
              <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Expected output</p>
                <div className="mt-4 space-y-3">
                  {(agent.outputSchema || []).map((field) => (
                    <div key={field.name} className="rounded-[22px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
                        {field.name.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-2 text-sm text-[#171717]">{field.type}</p>
                      <p className="mt-2 text-sm leading-7 text-[#4b463f]">{field.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </section>
      )}
    </div>
  )
}
