import React, { useState, useEffect } from 'react'
import { Button } from '../common/Button'
import { api } from '../../lib/api'
import { useNavigate, useParams } from 'react-router-dom'

export function BountyRegistration() {
    const { id: editId } = useParams<{ id: string }>()
    const isEditing = !!editId
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        id: 'orbit-protocol-v2',
        code: 'ORBIT',
        name: 'Orbit Protocol Core Contracts',
        company: 'Orbit Labs',
        tagline: 'Securing the next-gen cross-chain lending protocol.',
        description: 'Comprehensive security audit for Orbit Protocol V2 smart contracts, including the lending engine, risk manager, and cross-chain message relayers. We are looking for critical vulnerabilities that could lead to fund loss or price manipulation.',
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
    const [showPasswords, setShowPasswords] = useState(false)

    useEffect(() => {
        if (editId) {
            setLoading(true)
            api.get<any>(`/programs/${editId}`).then(res => {
                if (res.success) {
                    const data = res.data
                    setForm(prev => ({
                        ...prev,
                        id: data.id,
                        code: data.code,
                        name: data.name,
                        company: data.company,
                        tagline: data.tagline,
                        description: data.description,
                        criticalReward: data.rewardTiers?.find((t:any) => t.severity === 'CRITICAL')?.maxRewardUsd || 50000,
                        highReward: data.rewardTiers?.find((t:any) => t.severity === 'HIGH')?.maxRewardUsd || 25000,
                        mediumReward: data.rewardTiers?.find((t:any) => t.severity === 'MEDIUM')?.maxRewardUsd || 10000,
                        lowReward: data.rewardTiers?.find((t:any) => t.severity === 'LOW')?.maxRewardUsd || 5000,
                        categories: data.categories || [],
                        platforms: data.platforms || [],
                        languages: data.languages || [],
                        summaryHighlights: (data.summaryHighlights || []).join('\n'),
                        submissionChecklist: (data.submissionChecklist || []).join('\n'),
                        githubRepo: data.scopeTargets?.find((t:any) => t.referenceKind === 'GITHUB_REPO')?.location || '',
                        contractAddress: data.scopeTargets?.find((t:any) => t.referenceKind === 'CONTRACT_ADDRESS')?.location || '',
                        scheduledPublish: data.startedAt ? new Date(data.startedAt).toISOString().slice(0, 16) : prev.scheduledPublish,
                    }))
                }
            }).finally(() => setLoading(false))
        }
    }, [editId])

    const handleCheckbox = (field: 'categories' | 'platforms' | 'languages', value: string) => {
        setForm(curr => {
            const list = curr[field] as string[]
            if (list.includes(value)) return { ...curr, [field]: list.filter(v => v !== value) }
            return { ...curr, [field]: [...list, value] }
        })
    }

    const ALL_CATEGORIES = ['WEB', 'SMART_CONTRACT', 'APPS', 'BLOCKCHAIN']
    const ALL_PLATFORMS = ['ETHEREUM', 'ARBITRUM', 'BASE', 'MONAD', 'SUI', 'SOLANA', 'OFFCHAIN']
    const ALL_LANGUAGES = ['SOLIDITY', 'RUST', 'TYPESCRIPT', 'SWIFT', 'GO', 'MOVE']

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
                summaryHighlights: form.summaryHighlights.split('\n').map(s => s.trim()).filter(Boolean),
                submissionChecklist: form.submissionChecklist.split('\n').map(s => s.trim()).filter(Boolean),
                rewardTiers: [
                    { severity: 'CRITICAL', maxRewardUsd: form.criticalReward, triageSla: '24h', payoutWindow: '7d', examples: ['Remote Code Execution'] },
                    { severity: 'HIGH', maxRewardUsd: form.highReward, triageSla: '48h', payoutWindow: '7d', examples: ['Unauthorized access'] },
                    { severity: 'MEDIUM', maxRewardUsd: form.mediumReward, triageSla: '72h', payoutWindow: '7d', examples: ['Sensitive info leak'] },
                    { severity: 'LOW', maxRewardUsd: form.lowReward, triageSla: '7 days', payoutWindow: '7d', examples: ['Missing security headers'] }
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
                        referenceUrl: form.githubRepo
                    },
                    { 
                        label: 'Main Contract', 
                        location: form.contractAddress, 
                        assetType: 'SMART_CONTRACT', 
                        severity: 'CRITICAL', 
                        reviewStatus: 'Pending', 
                        note: 'Core lending engine',
                        referenceKind: 'CONTRACT_ADDRESS',
                        referenceValue: form.contractAddress
                    }
                ],
                triageStages: [
                    { order: 1, title: 'AI Intake', owner: 'AuditPal AI', automation: 'Full', trigger: 'Submission', outputs: ['Initial score'], humanGate: 'None' }
                ],
                policySections: [
                    { order: 1, title: 'Program Rules', items: ['Do not disrupt service', 'No social engineering'] }
                ],
                ...(!isEditing && {
                    gatekeeperEmail: form.gatekeeperEmail,
                    gatekeeperPassword: form.gatekeeperPassword,
                    validatorEmail: form.validatorEmail,
                    validatorPassword: form.validatorPassword
                })
            };

            const res = isEditing 
                ? await api.patch(`/programs/${editId}`, payload)
                : await api.post('/programs', payload);

            if (res.success) {
                alert(isEditing ? 'Bounty updated successfully!' : 'Bounty registered! Please fund it to go active.')
                navigate('/org/dashboard')
            } else {
                const errorMessage = typeof res.error === 'object' 
                    ? JSON.stringify(res.error, null, 2) 
                    : res.error || 'Failed to register bounty'
                alert(errorMessage)
            }
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-10">
            <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)]">
                <h1 className="font-serif text-4xl text-[#171717]">{isEditing ? 'Edit Bounty' : 'Register a New Bounty'}</h1>
                <p className="mt-4 text-[#4b463f]">{isEditing ? 'Update the details for your existing program.' : 'Onboard your project to the AuditPal network.'}</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                    {/* General Information */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">1. General Information</h2>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Program ID (slug)</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="e.g. uniswap-v4" required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Display Code</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. UNIv4" required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Program Name</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Uniswap v4 Core" required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Company Name</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g. Uniswap Labs" required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Tagline</label>
                            <input
                                className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Secure the future of AMMs" required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Description</label>
                            <textarea
                                className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Detailed program scope and policy..." required
                            />
                        </div>
                    </div>

                    {/* Target Scope */}
                    <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">2. Target Scope</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">GitHub Repository</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.githubRepo} onChange={e => setForm({ ...form, githubRepo: e.target.value })} placeholder="https://github.com/org/repo" required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Contract Address</label>
                                <input
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                    value={form.contractAddress} onChange={e => setForm({ ...form, contractAddress: e.target.value })} placeholder="0x..." required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">3. Tech Stack Classification</h2>
                        
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Categories</label>
                                <div className="space-y-2">
                                    {ALL_CATEGORIES.map(cat => (
                                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.categories.includes(cat)} onChange={() => handleCheckbox('categories', cat)} className="rounded text-[#315e50]" />
                                            <span className="text-sm text-[#4b463f]">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Platforms</label>
                                <div className="space-y-2">
                                    {ALL_PLATFORMS.map(plat => (
                                        <label key={plat} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.platforms.includes(plat)} onChange={() => handleCheckbox('platforms', plat)} className="rounded text-[#315e50]" />
                                            <span className="text-sm text-[#4b463f]">{plat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Languages</label>
                                <div className="space-y-2">
                                    {ALL_LANGUAGES.map(lang => (
                                        <label key={lang} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={form.languages.includes(lang)} onChange={() => handleCheckbox('languages', lang)} className="rounded text-[#315e50]" />
                                            <span className="text-sm text-[#4b463f]">{lang}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reward Tiers */}
                    <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">4. Reward Tiers (USDC)</h2>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#e53e3e]">Critical Max</label>
                                <input type="number" className="w-full rounded-2xl border border-[#d9d1c4] px-4 py-3 text-sm focus:border-red-500" value={form.criticalReward} onChange={e => setForm({...form, criticalReward: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#dd6b20]">High Max</label>
                                <input type="number" className="w-full rounded-2xl border border-[#d9d1c4] px-4 py-3 text-sm focus:border-orange-500" value={form.highReward} onChange={e => setForm({...form, highReward: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#d69e2e]">Medium Max</label>
                                <input type="number" className="w-full rounded-2xl border border-[#d9d1c4] px-4 py-3 text-sm focus:border-yellow-500" value={form.mediumReward} onChange={e => setForm({...form, mediumReward: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#38a169]">Low Max</label>
                                <input type="number" className="w-full rounded-2xl border border-[#d9d1c4] px-4 py-3 text-sm focus:border-green-500" value={form.lowReward} onChange={e => setForm({...form, lowReward: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>

                    {/* Resources & Checklist */}
                    <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">5. Resources & Checklist</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Highlights (one per line)</label>
                                <textarea
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                    value={form.summaryHighlights} onChange={e => setForm({ ...form, summaryHighlights: e.target.value })} rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Submission Checklist (one per line)</label>
                                <textarea
                                    className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                    value={form.submissionChecklist} onChange={e => setForm({ ...form, submissionChecklist: e.target.value })} rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">6. Go-Live Schedule</h2>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#7b7468]">Target Publish Date</label>
                            <input
                                type="datetime-local"
                                className="w-full md:w-1/2 rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 outline-none focus:border-[#171717]"
                                value={form.scheduledPublish} onChange={e => setForm({ ...form, scheduledPublish: e.target.value })} required
                            />
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="space-y-4 pt-6 border-t border-[#ebe4d8]">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7b7468]">7. Submission Checkers</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold uppercase text-[#7b7468]">Junior Checker (Gatekeeper) Email</label>
                                    <input
                                        type="email"
                                        className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                        value={form.gatekeeperEmail} onChange={e => setForm({ ...form, gatekeeperEmail: e.target.value })} placeholder="gatekeeper@auditpal.io" required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold uppercase text-[#7b7468]">Junior Checker Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                            value={form.gatekeeperPassword} onChange={e => setForm({ ...form, gatekeeperPassword: e.target.value })} placeholder="••••••••" required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-[#7b7468] hover:text-[#171717]"
                                        >
                                            {showPasswords ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold uppercase text-[#7b7468]">Senior Human Checker (Validator) Email</label>
                                    <input
                                        type="email"
                                        className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                        value={form.validatorEmail} onChange={e => setForm({ ...form, validatorEmail: e.target.value })} placeholder="validator@auditpal.io" required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold uppercase text-[#7b7468]">Senior Checker Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            className="w-full rounded-2xl border border-[#d9d1c4] bg-white px-4 py-3 text-sm outline-none focus:border-[#171717]"
                                            value={form.validatorPassword} onChange={e => setForm({ ...form, validatorPassword: e.target.value })} placeholder="••••••••" required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-[#7b7468] hover:text-[#171717]"
                                        >
                                            {showPasswords ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4" disabled={loading}>
                        {loading ? 'Processing...' : isEditing ? 'Save Changes' : 'Submit Program Design'}
                    </Button>
                </form>
            </section>
        </div>
    )
}
