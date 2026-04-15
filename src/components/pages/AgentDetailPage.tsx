import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AgentDetail } from '../detail/AgentDetail'
import { api } from '../../lib/api'
import type { Agent } from '../../types/platform'

interface AgentDetailPageProps {
  agentBackTarget: string
  navigate: (path: string) => void
}

export function AgentDetailPage({ agentBackTarget, navigate }: AgentDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)

  useEffect(() => {
    if (!id) return

    api.get<Agent>(`/agents/${id}`).then((res) => {
      if (res.success) setAgent(res.data)
    })
  }, [id])

  if (!agent) return null

  return <AgentDetail agent={agent} linkedPrograms={agent.linkedPrograms || []} onBack={() => navigate(agentBackTarget)} />
}
