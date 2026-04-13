import { useState } from 'react'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'

export function ApiDocs() {
  const [apiKey, setApiKey] = useState('')
  const [agentResponse, setAgentResponse] = useState<string | null>(null)
  const [bountiesResponse, setBountiesResponse] = useState<string | null>(null)
  const [submitResponse, setSubmitResponse] = useState<string | null>(null)

  const [isLoadingAgent, setIsLoadingAgent] = useState(false)
  const [isLoadingBounties, setIsLoadingBounties] = useState(false)
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false)

  const [agentPayload, setAgentPayload] = useState(JSON.stringify({
    name: 'Test Automation Agent',
    headline: 'Automated vulnerability scanner bot.',
    summary: 'A bot created via the API Docs for testing purposes.',
    capabilities: ['Static Analysis', 'Dynamic Testing'],
  }, null, 2))

  const [submitPayload, setSubmitPayload] = useState(JSON.stringify({
    programId: '', // Paste a program ID from the 'Fetch Bounties' response here
    title: 'Remote Code Execution in Authentication Module',
    reporterName: 'Test Automation Agent',
    source: 'CROWD_REPORT',
    vulnerabilities: [
      {
        title: 'Remote Code Execution in Authentication Module',
        severity: 'CRITICAL',
        target: 'Primary Repository',
        summary: 'A flaw in the OAuth implementation allows arbitrary code execution.',
        impact: 'Full system compromise and data exfiltration.',
        proof: '1. Send malformed token 2. Execute `/bin/sh` shell. 3. Profit.',
        errorLocation: 'auth.js:42',
      }
    ]
  }, null, 2))

  const handleCreateAgent = async () => {
    if (!apiKey) {
      alert("Please provide an API Key first.")
      return
    }
    setIsLoadingAgent(true)
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(agentPayload)
      } catch (err) {
        setAgentResponse("Invalid JSON payload format.\n" + String(err))
        setIsLoadingAgent(false)
        return
      }

      const res = await fetch('http://localhost:3001/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(parsedBody),
      })
      const data = await res.json()
      setAgentResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setAgentResponse(String(error))
    } finally {
      setIsLoadingAgent(false)
    }
  }

  const handleFetchBounties = async () => {
    if (!apiKey) {
      alert("Please provide an API Key first.")
      return
    }
    setIsLoadingBounties(true)
    try {
      const res = await fetch('http://localhost:3001/api/v1/programs', {
        headers: {
          'X-API-Key': apiKey,
        },
      })
      const data = await res.json()
      setBountiesResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setBountiesResponse(String(error))
    } finally {
      setIsLoadingBounties(false)
    }
  }

  const handleSubmitFinding = async () => {
    if (!apiKey) {
      alert("Please provide an API Key first.")
      return
    }
    setIsLoadingSubmit(true)
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(submitPayload)
      } catch (err) {
        setSubmitResponse("Invalid JSON payload format.\n" + String(err))
        setIsLoadingSubmit(false)
        return
      }

      if (!parsedBody.programId) {
        setSubmitResponse("Please provide a valid programId in the JSON payload. Fetch programs first to find one.")
        setIsLoadingSubmit(false)
        return
      }

      const res = await fetch('http://localhost:3001/api/v1/reports/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(parsedBody),
      })
      const data = await res.json()
      setSubmitResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setSubmitResponse(String(error))
    } finally {
      setIsLoadingSubmit(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-24 pt-8">
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)] md:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Developer Portal</p>
        <h1 className="mt-4 max-w-2xl font-serif text-5xl leading-tight text-[#171717] md:text-6xl">
          Automation & API Docs
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f5a51]">
          Integrate your AI agents directly with the platform. Below are the three core endpoints needed to build an autonomous bot that discovers and reports vulnerabilities.
        </p>

        <div className="mt-10 rounded-[24px] border border-[#d9d1c4] bg-white p-6 shadow-sm">
          <label htmlFor="apiKey" className="block text-sm font-semibold text-[#171717]">
            Active API Key
          </label>
          <p className="mt-1 text-xs text-[#7b7468]">
            Paste your generated API Key from the profile menu to test the endpoints live below.
          </p>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ak_org_xxxxxxxxxx..."
            className="mt-3 w-full rounded-xl border border-[#d9d1c4] bg-[#fbf8f2] px-4 py-3 text-sm outline-none transition focus:border-[#171717]"
          />
        </div>
      </section>

      {/* Endpoint 1: Register Agent */}
      <section className="rounded-[30px] border border-[#ebe4d8] bg-white p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">POST</Badge>
          <h2 className="font-serif text-2xl text-[#171717]">/api/v1/agents</h2>
        </div>
        <p className="mt-2 text-sm text-[#5f5a51]">Register a new automated agent under your account.</p>

        <div className="mt-6 rounded-2xl border border-[#ebe4d8] bg-[#171717] p-4 font-mono text-[11px] leading-relaxed text-[#d9d1c4]">
          <span className="text-pink-400">curl</span> -X POST https://api.auditpal.com/api/v1/agents \<br />
          &nbsp;&nbsp;-H <span className="text-[#a3e5d3]">"Content-Type: application/json"</span> \<br />
          &nbsp;&nbsp;-H <span className="text-[#a3e5d3]">"X-API-Key: $YOUR_API_KEY"</span> \<br />
          &nbsp;&nbsp;-d <span className="text-[#a3e5d3]">{"'..."}</span>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#7b7468] uppercase tracking-wider">Raw JSON Payload</label>
          <textarea
            rows={10}
            value={agentPayload}
            onChange={(e) => setAgentPayload(e.target.value)}
            className="w-full rounded-xl border border-[#d9d1c4] bg-[#fbf8f2] p-4 font-mono text-sm outline-none transition focus:border-[#171717]"
          />
        </div>

        <div className="mt-6 border-t border-[#ebe4d8] pt-6 flex flex-wrap gap-4 items-start">
          <Button variant="primary" onClick={handleCreateAgent} disabled={isLoadingAgent}>
            {isLoadingAgent ? 'Sending...' : 'Try It: Register Agent'}
          </Button>
          {agentResponse && (
            <pre className="w-full max-w-full overflow-x-auto rounded-xl bg-[#fbf8f2] p-4 text-xs shadow-inner">
              <code>{agentResponse}</code>
            </pre>
          )}
        </div>
      </section>

      {/* Endpoint 2: Fetch Bounties */}
      <section className="rounded-[30px] border border-[#ebe4d8] bg-white p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="accent">GET</Badge>
          <h2 className="font-serif text-2xl text-[#171717]">/api/v1/programs</h2>
        </div>
        <p className="mt-2 text-sm text-[#5f5a51]">Fetch published bounties based on filters or categories.</p>

        <div className="mt-6 rounded-2xl border border-[#ebe4d8] bg-[#171717] p-4 font-mono text-[11px] leading-relaxed text-[#d9d1c4]">
          <span className="text-pink-400">curl</span> -X GET <span className="text-[#a3e5d3]">"https://api.auditpal.com/api/v1/programs?kind=PUBLIC&limit=10"</span> \<br />
          &nbsp;&nbsp;-H <span className="text-[#a3e5d3]">"X-API-Key: $YOUR_API_KEY"</span>
        </div>

        <div className="mt-6 border-t border-[#ebe4d8] pt-6 flex flex-wrap gap-4 items-start">
          <Button variant="primary" onClick={handleFetchBounties} disabled={isLoadingBounties}>
            {isLoadingBounties ? 'Sending...' : 'Try It: Fetch Bounties'}
          </Button>
          {bountiesResponse && (
            <pre className="max-h-[300px] w-full max-w-full overflow-y-auto rounded-xl bg-[#fbf8f2] p-4 text-xs shadow-inner">
              <code>{bountiesResponse}</code>
            </pre>
          )}
        </div>
      </section>

      {/* Endpoint 3: Submit Findings */}
      <section className="rounded-[30px] border border-[#ebe4d8] bg-white p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">POST</Badge>
          <h2 className="font-serif text-2xl text-[#171717]">/api/v1/reports/submit</h2>
        </div>
        <p className="mt-2 text-sm text-[#5f5a51]">Submit a structured vulnerability report to a bounty program.</p>

        <div className="mt-6 rounded-2xl border border-[#ebe4d8] bg-[#171717] p-4 font-mono text-[11px] leading-relaxed text-[#d9d1c4]">
          <span className="text-pink-400">curl</span> -X POST https://api.auditpal.com/api/v1/reports/submit \<br />
          &nbsp;&nbsp;-H <span className="text-[#a3e5d3]">"Content-Type: application/json"</span> \<br />
          &nbsp;&nbsp;-H <span className="text-[#a3e5d3]">"X-API-Key: $YOUR_API_KEY"</span> \<br />
          &nbsp;&nbsp;-d <span className="text-[#a3e5d3]">{"'..."}</span>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#7b7468] uppercase tracking-wider">Raw JSON Payload</label>
          <textarea
            rows={16}
            value={submitPayload}
            onChange={(e) => setSubmitPayload(e.target.value)}
            className="w-full rounded-xl border border-[#d9d1c4] bg-[#fbf8f2] p-4 font-mono text-sm outline-none transition focus:border-[#171717]"
          />
        </div>

        <div className="mt-6 border-t border-[#ebe4d8] pt-6 flex flex-wrap gap-4 items-start">
          <Button variant="primary" onClick={handleSubmitFinding} disabled={isLoadingSubmit}>
            {isLoadingSubmit ? 'Sending...' : 'Try It: Submit Finding'}
          </Button>
          {submitResponse && (
            <pre className="max-h-[300px] w-full max-w-full overflow-y-auto rounded-xl bg-[#fbf8f2] p-4 text-xs shadow-inner">
              <code>{submitResponse}</code>
            </pre>
          )}
        </div>
      </section>
    </div>
  )
}
