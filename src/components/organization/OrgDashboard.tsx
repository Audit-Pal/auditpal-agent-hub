import React, { useEffect, useState } from 'react'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { api } from '../../lib/api'
import { Link } from 'react-router-dom'
import type { Program } from '../../types/platform'
import { useAuth } from '../../contexts/AuthContext'

export function OrgDashboard() {
    const { user } = useAuth()
    const [programs, setPrograms] = useState<Program[]>([])
    const [loading, setLoading] = useState(true)
    const [fundAmounts, setFundAmounts] = useState<Record<string, number>>({})

    useEffect(() => {
        fetchPrograms()
    }, [])

    const fetchPrograms = async () => {
        try {
            const res = await api.get<Program[]>('/programs/mine')
            if (res.success) {
                setPrograms(res.data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleFund = async (id: string) => {
        const amount = fundAmounts[id]
        if (!amount || amount <= 0) {
            alert('Please enter a valid funding amount.')
            return
        }
        try {
            const res = await api.post(`/programs/${id}/fund`, { amount })
            if (res.success) {
                alert('Program funded and activated!')
                fetchPrograms()
            } else {
                alert(res.error || 'Funding failed')
            }
        } catch (err) {
            console.error(err)
        }
    }
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this program?')) return
        try {
            const res = await api.delete(`/programs/${id}`)
            if (res.success) {
                fetchPrograms()
            } else {
                alert('Failed to delete program: ' + res.error)
            }
        } catch(err) {
            console.error(err)
        }
    }

    const handleArchive = async (id: string) => {
        if (!confirm('Archive this program? It will no longer be visible.')) return
        try {
            const res = await api.patch(`/programs/${id}`, { status: 'CLOSED', isPublished: false })
            if (res.success) {
                fetchPrograms()
            } else {
                alert('Failed to archive program: ' + res.error)
            }
        } catch(err) {
            console.error(err)
        }
    }
    if (!loading && user?.role !== 'ORGANIZATION') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h2 className="text-2xl font-serif text-[#171717]">Access Restricted</h2>
                <p className="mt-2 text-[#7b7468]">Only organization accounts can access this workspace.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <section className="rounded-[38px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_24px_80px_rgba(30,24,16,0.08)] flex flex-wrap items-center justify-between gap-6">
                <div>
                    <h1 className="font-serif text-5xl text-[#171717]">Organization Workspace</h1>
                    <p className="mt-4 text-[#4b463f]">Manage your security programs and treasury.</p>
                </div>
                <Link to="/org/register-bounty">
                    <Button variant="primary" size="lg">
                        Register New Bounty
                    </Button>
                </Link>
            </section>

            <div className="grid gap-6">
                {loading ? (
                    <p>Loading programs...</p>
                ) : programs.length === 0 ? (
                    <div className="rounded-[30px] border border-dashed border-[#d9d1c4] p-12 text-center bg-[#fbf8f2]/50">
                        <p className="text-[#7b7468] font-medium">No programs registered yet.</p>
                        <p className="mt-2 text-sm text-[#a39c91]">Create your first bounty program to start receiving vulnerability reports.</p>
                        <Link to="/org/register-bounty" className="inline-block mt-6">
                            <Button variant="outline" size="md">Register New Bounty</Button>
                        </Link>
                    </div>
                ) : (
                    programs.map(program => (
                        <article key={program.id} className="rounded-[30px] border border-[#d9d1c4] bg-white p-6 flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-[#171717] flex items-center justify-center text-xl font-bold text-white">
                                    {program.logoMark}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-semibold text-[#171717]">{program.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone="soft">{program.code}</Badge>
                                        <Badge tone={program.status === 'ACTIVE' ? 'success' : 'medium'}>{program.status === 'ACTIVE' ? 'PUBLISHED' : 'DRAFT'}</Badge>
                                        <Badge tone="accent">{(program as any)._count?.reports || 0} applications</Badge>
                                        {(program as any).publishedAt && (
                                            <span className="text-[10px] text-[#7b7468] uppercase tracking-wider">
                                                Go-live: {new Date((program as any).publishedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    {program.status !== 'ACTIVE' && (
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7468] text-sm">$</span>
                                                <input 
                                                    type="number"
                                                    placeholder="Amount"
                                                    value={fundAmounts[program.id] || ''}
                                                    onChange={e => setFundAmounts(c => ({...c, [program.id]: Number(e.target.value)}))}
                                                    className="w-32 rounded-full border border-[#d9d1c4] bg-white pl-7 pr-4 py-2 text-sm outline-none focus:border-[#171717]"
                                                />
                                            </div>
                                            <Button variant="primary" size="md" onClick={() => handleFund(program.id)}>
                                                Lock Funds & Start
                                            </Button>
                                        </div>
                                    )}
                                    <Link to="/reports">
                                        <Button variant="outline" size="md">
                                            Manage Applications
                                        </Button>
                                    </Link>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-[#ebe4d8]">
                                    <Link to={`/org/edit-bounty/${program.id}`}>
                                        <Button variant="ghost" size="sm">Edit Details</Button>
                                    </Link>
                                    {program.status !== 'CLOSED' && (
                                        <Button variant="ghost" size="sm" onClick={() => handleArchive(program.id)}>Archive</Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(program.id)}>Delete</Button>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    )
}
