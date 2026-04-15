import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../common/Button'
import { api } from '../../lib/api'

const ALL_CATEGORIES = ['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN']
const ALL_PLATFORMS = ['ETHEREUM', 'ARBITRUM', 'BASE', 'MONAD', 'SUI', 'SOLANA', 'OFFCHAIN']
const ALL_LANGUAGES = ['SOLIDITY', 'RUST', 'TYPESCRIPT', 'SWIFT', 'GO', 'MOVE']

export function BountyRegistration() {
  const { id: editId } = useParams<{ id: string }>()
  const isEditing = !!editId
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [form, setForm] = useState({
    id: 'orbit-protocol-v2',
    code: 'ORBIT',
    name: 'Orbit Protocol Core Contracts',
    company: 'Orbit Labs',
    tagline: 'Securing the next-gen cross-chain lending protocol.',
    description:
      'Comprehensive security audit for Orbit Protocol V2 smart contracts, including the lending engine, risk manager, and cross-chain message relayers. We are looking for critical vulnerabilities that could lead to fund loss or price manipulation.',
    gatekeeperEmail: 'gatekeeper@auditpal.io',
    gatekeeperPassword: 'Password123!',
    validatorEmail: 'validator@auditpal.io',
    validatorPassword: 'Password123!',
    githubRepo: 'https://github.com/orbit-labs/core-v2',
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    criticalReward: 50000,
    highReward: 25000,
    mediumReward: 10000,
    lowReward: 5000,
    categories: ['WEB', 'SMART_CONTRACT'],
    platforms: ['ETHEREUM', 'ARBITRUM'],
    languages: ['SOLIDITY', 'TYPESCRIPT'],
    summaryHighlights: 'High rewards\nActive triage',
    submissionChecklist: 'PoC required\nClean code',
    scheduledPublish: new Date().toISOString().slice(0, 16),
  })

  useEffect(() => {
    if (!editId) return

    setLoading(true)
    api.get<any>(`/programs/${editId}`)
      .then((res) => {
        if (!res.success) return

        const data = res.data
        setForm((prev) => ({
          ...prev,
          id: data.id,
          code: data.code,
          name: data.name,
          company: data.company,
          tagline: data.tagline,
          description: data.description,
          criticalReward: data.rewardTiers?.find((tier: any) => tier.severity === 'CRITICAL')?.maxRewardUsd || 50000,
          highReward: data.rewardTiers?.find((tier: any) => tier.severity === 'HIGH')?.maxRewardUsd || 25000,
          mediumReward: data.rewardTiers?.find((tier: any) => tier.severity === 'MEDIUM')?.maxRewardUsd || 10000,
          lowReward: data.rewardTiers?.find((tier: any) => tier.severity === 'LOW')?.maxRewardUsd || 5000,
          categories: data.categories || [],
          platforms: data.platforms || [],
          languages: data.languages || [],
          summaryHighlights: (data.summaryHighlights || []).join('\n'),
          submissionChecklist: (data.submissionChecklist || []).join('\n'),
          githubRepo: data.scopeTargets?.find((target: any) => target.referenceKind === 'GITHUB_REPO')?.location || '',
          contractAddress: data.scopeTargets?.find((target: any) => target.referenceKind === 'CONTRACT_ADDRESS')?.location || '',
          scheduledPublish: data.startedAt ? new Date(data.startedAt).toISOString().slice(0, 16) : prev.scheduledPublish,
        }))
      })
      .finally(() => setLoading(false))
  }, [editId])

  const handleCheckbox = (field: 'categories' | 'platforms' | 'languages', value: string) => {
    setForm((current) => {
      const list = current[field] as string[]
      if (list.includes(value)) return { ...current, [field]: list.filter((item) => item !== value) }
      return { ...current, [field]: [...list, value] }
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...form,
        kind: 'BUG_BOUNTY',
        accentTone: 'mint',
        logoMark: form.company.substring(0, 1).toUpperCase(),
        startedAt: new Date(form.scheduledPublish).toISOString(),
        maxBountyUsd: form.criticalReward,
        responseSla: '48 hours',
        payoutCurrency: 'USDC',
        payoutWindow: '7 days',
        duplicatePolicy: 'First reporter only.',
        disclosureModel: 'Responsible disclosure.',
        categories: form.categories.length ? form.categories : ['WEB'],
        platforms: form.platforms.length ? form.platforms : ['ETHEREUM'],
        languages: form.languages.length ? form.languages : ['SOLIDITY'],
        summaryHighlights: form.summaryHighlights.split('\n').map((item) => item.trim()).filter(Boolean),
        submissionChecklist: form.submissionChecklist.split('\n').map((item) => item.trim()).filter(Boolean),
        rewardTiers: [
          { severity: 'CRITICAL', maxRewardUsd: form.criticalReward, triageSla: '24h', payoutWindow: '7d', examples: ['Remote code execution'] },
          { severity: 'HIGH', maxRewardUsd: form.highReward, triageSla: '48h', payoutWindow: '7d', examples: ['Unauthorized access'] },
          { severity: 'MEDIUM', maxRewardUsd: form.mediumReward, triageSla: '72h', payoutWindow: '7d', examples: ['Sensitive info leak'] },
          { severity: 'LOW', maxRewardUsd: form.lowReward, triageSla: '7 days', payoutWindow: '7d', examples: ['Missing security headers'] },
        ],
        scopeTargets: [
          {
            label: 'Primary Repository',
            location: form.githubRepo,
            assetType: 'CODEBASE',
            severity: 'HIGH',
            reviewStatus: 'Pending',
            note: 'Main core repository',
            referenceKind: 'GITHUB_REPO',
            referenceUrl: form.githubRepo,
          },
          {
            label: 'Main Contract',
            location: form.contractAddress,
            assetType: 'SMART_CONTRACT',
            severity: 'CRITICAL',
            reviewStatus: 'Pending',
            note: 'Core lending engine',
            referenceKind: 'CONTRACT_ADDRESS',
            referenceValue: form.contractAddress,
          },
        ],
        triageStages: [
          { order: 1, title: 'AI Intake', owner: 'AuditPal AI', automation: 'Full', trigger: 'Submission', outputs: ['Initial score'], humanGate: 'None' },
        ],
        policySections: [{ order: 1, title: 'Program Rules', items: ['Do not disrupt service', 'No social engineering'] }],
        ...(!isEditing && {
          gatekeeperEmail: form.gatekeeperEmail,
          gatekeeperPassword: form.gatekeeperPassword,
          validatorEmail: form.validatorEmail,
          validatorPassword: form.validatorPassword,
        }),
      }

      const res = isEditing ? await api.patch(`/programs/${editId}`, payload) : await api.post('/programs', payload)

      if (res.success) {
        alert(isEditing ? 'Bounty updated successfully!' : 'Bounty registered! Please fund it to go active.')
        navigate('/org/dashboard')
      } else {
        const errorMessage = typeof res.error === 'object' ? JSON.stringify(res.error, null, 2) : res.error || 'Failed to register bounty'
        alert(errorMessage)
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const renderSelectionGroup = (
    label: string,
    field: 'categories' | 'platforms' | 'languages',
    options: readonly string[],
  ) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const selected = form[field].includes(option)
          return (
            <label
              key={option}
              className={[
                'flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 text-sm transition',
                selected
                  ? 'border-[rgba(15,118,110,0.18)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'border-[rgba(15,23,38,0.08)] bg-white/80 text-[var(--text-soft)] hover:border-[rgba(15,118,110,0.18)]',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => handleCheckbox(field, option)}
                className="h-4 w-4 rounded border-[rgba(15,23,38,0.16)]"
              />
              {option}
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="hero-card rounded-[40px] p-8 md:p-10 xl:p-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-kicker">Organization onboarding</p>
            <h1 className="section-title mt-4 max-w-4xl">{isEditing ? 'Refine your program design before it goes live.' : 'Launch a new bounty program with a guided setup flow.'}</h1>
            <p className="section-copy mt-5 max-w-3xl text-lg">
              {isEditing
                ? 'Update policy, funding, scope references, and reviewer details from one structured surface.'
                : 'This onboarding flow is designed to help security teams define scope, rewards, reviewers, and go-live timing without feeling buried in raw fields.'}
            </p>
          </div>

          <aside className="surface-card-muted rounded-[30px] p-6">
            <p className="section-kicker">Setup path</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
              <p>1. Define the program identity and researcher-facing summary.</p>
              <p>2. Add core code references, severity rewards, and supported surfaces.</p>
              <p>3. Configure reviewers and choose when the program should go live.</p>
            </div>
          </aside>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">1. Program identity</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Program ID</label>
              <input className="field" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} placeholder="uniswap-v4" required />
            </div>
            <div>
              <label className="field-label">Display code</label>
              <input className="field" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="UNI-V4" required />
            </div>
            <div>
              <label className="field-label">Program name</label>
              <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Uniswap v4 Core" required />
            </div>
            <div>
              <label className="field-label">Company name</label>
              <input className="field" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Uniswap Labs" required />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="field-label">Tagline</label>
              <input className="field" value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} placeholder="Secure the future of AMMs" required />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea className="field-area" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} placeholder="Describe the security scope, risk focus, and reward intent." required />
            </div>
          </div>
        </section>

        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">2. Core scope references</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">GitHub repository</label>
              <input className="field" value={form.githubRepo} onChange={(event) => setForm({ ...form, githubRepo: event.target.value })} placeholder="https://github.com/org/repo" required />
            </div>
            <div>
              <label className="field-label">Primary contract address</label>
              <input className="field" value={form.contractAddress} onChange={(event) => setForm({ ...form, contractAddress: event.target.value })} placeholder="0x1234..." required />
            </div>
          </div>
        </section>

        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">3. Coverage and technology</p>
          <div className="mt-6 space-y-6">
            {renderSelectionGroup('Categories', 'categories', ALL_CATEGORIES)}
            {renderSelectionGroup('Platforms', 'platforms', ALL_PLATFORMS)}
            {renderSelectionGroup('Languages', 'languages', ALL_LANGUAGES)}
          </div>
        </section>

        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">4. Reward tiers</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { key: 'criticalReward', label: 'Critical max', accent: 'text-[var(--critical-text)]' },
              { key: 'highReward', label: 'High max', accent: 'text-[var(--warning-text)]' },
              { key: 'mediumReward', label: 'Medium max', accent: 'text-[#8d6b11]' },
              { key: 'lowReward', label: 'Low max', accent: 'text-[var(--success-text)]' },
            ].map((item) => (
              <div key={item.key} className="surface-card-muted rounded-[22px] p-4">
                <label className={`field-label ${item.accent}`}>{item.label}</label>
                <input
                  type="number"
                  className="field"
                  value={form[item.key as keyof typeof form] as number}
                  onChange={(event) => setForm({ ...form, [item.key]: Number(event.target.value) })}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">5. Researcher guidance</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Highlights</label>
              <textarea className="field-area" value={form.summaryHighlights} onChange={(event) => setForm({ ...form, summaryHighlights: event.target.value })} rows={4} />
            </div>
            <div>
              <label className="field-label">Submission checklist</label>
              <textarea className="field-area" value={form.submissionChecklist} onChange={(event) => setForm({ ...form, submissionChecklist: event.target.value })} rows={4} />
            </div>
          </div>
        </section>

        <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
          <p className="section-kicker">6. Go-live schedule</p>
          <div className="mt-6 max-w-md">
            <label className="field-label">Target publish date</label>
            <input type="datetime-local" className="field" value={form.scheduledPublish} onChange={(event) => setForm({ ...form, scheduledPublish: event.target.value })} required />
          </div>
        </section>

        {!isEditing && (
          <section className="surface-card-strong rounded-[34px] p-6 md:p-8">
            <p className="section-kicker">7. Reviewer setup</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[var(--text)]">Gatekeeper account</h2>
                <div>
                  <label className="field-label">Gatekeeper email</label>
                  <input type="email" className="field" value={form.gatekeeperEmail} onChange={(event) => setForm({ ...form, gatekeeperEmail: event.target.value })} required />
                </div>
                <div>
                  <label className="field-label">Gatekeeper password</label>
                  <div className="relative">
                    <input type={showPasswords ? 'text' : 'password'} className="field !pr-16" value={form.gatekeeperPassword} onChange={(event) => setForm({ ...form, gatekeeperPassword: event.target.value })} required />
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text)]">
                      {showPasswords ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[var(--text)]">Validator account</h2>
                <div>
                  <label className="field-label">Validator email</label>
                  <input type="email" className="field" value={form.validatorEmail} onChange={(event) => setForm({ ...form, validatorEmail: event.target.value })} required />
                </div>
                <div>
                  <label className="field-label">Validator password</label>
                  <div className="relative">
                    <input type={showPasswords ? 'text' : 'password'} className="field !pr-16" value={form.validatorPassword} onChange={(event) => setForm({ ...form, validatorPassword: event.target.value })} required />
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text)]">
                      {showPasswords ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm leading-7 text-[var(--text-soft)]">
            {isEditing ? 'Save your updates and return to the organization workspace.' : 'Submit the design now, then fund the program from the organization dashboard to activate it.'}
          </p>
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? 'Processing...' : isEditing ? 'Save program changes' : 'Submit program design'}
          </Button>
        </div>
      </form>
    </div>
  )
}
