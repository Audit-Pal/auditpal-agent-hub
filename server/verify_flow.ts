const BASE_URL = 'http://localhost:3001/api/v1'

async function test() {
    console.log('--- Starting Verification Flow ---')

    // 1. Register Bounty Hunter
    console.log('1. Registering Bounty Hunter...')
    const bhEmail = `bh_${Date.now()}@test.com`
    const bhRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: bhEmail,
            password: 'Password123!',
            name: 'Test Bounty Hunter',
            role: 'BOUNTY_HUNTER'
        })
    })
    const bhData = await bhRes.json() as any
    const bhToken = bhData.data.accessToken
    console.log('   Bounty Hunter registered.')

    // 2. Register Organization
    console.log('2. Registering Organization user...')
    const orgEmail = `org_${Date.now()}@test.com`
    const orgRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: orgEmail,
            password: 'Password123!',
            name: 'Test Org Admin',
            role: 'ORGANIZATION',
            organizationName: 'Test Labs'
        })
    })
    const orgData = await orgRes.json() as any
    const orgToken = orgData.data.accessToken
    console.log('   Organization registered.')

    // 3. Submit High-Quality Report
    console.log('3. Submitting high-quality report...')
    const highQualityRes = await fetch(`${BASE_URL}/reports/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bhToken}`
        },
        body: JSON.stringify({
            programId: 'atlas-bridge-smart-contracts',
            title: 'Critical reentrancy in BridgeRouter settlement',
            severity: 'CRITICAL',
            target: 'BridgeRouter.sol',
            summary: 'The settlement function does not follow the checks-effects-interactions pattern. An attacker can call back into the route and drain funds before the balance is updated. This is a very detailed summary that should pass the filter.',
            impact: 'Complete drainage of bridge liquidity across all supported chains.',
            proof: '1. Deploy malicious contract. 2. Invoke deposit with callback. 3. Trigger multiple withdrawals in a single transaction path.',
            reporterName: 'GhostAgent',
            codeSnippet: 'function settle(uint256 amount) external {\n  // Checks-effects-interactions violation\n  payable(msg.sender).call{value: amount}("");\n  balances[msg.sender] -= amount;\n}',
            errorLocation: 'BridgeRouter.sol:45-50',
            knowledgeGraph: {
                entities: [
                    { id: 'v1', type: 'Vulnerability', name: 'Reentrancy', properties: { cwe: 'CWE-841' } },
                    { id: 'c1', type: 'Component', name: 'BridgeRouter.sol', properties: { language: 'Solidity' } }
                ],
                relations: [
                    { sourceId: 'v1', targetId: 'c1', type: 'AFFECTS' }
                ]
            }
        })
    })
    const hqData = await highQualityRes.json() as any
    if (!hqData.success) {
        console.error('   Error submitting high-quality report:', hqData)
        return
    }
    const hqReportId = hqData.data.id
    console.log(`   Report submitted. ID: ${hqReportId}, Status: ${hqData.data.status}, AI Score: ${hqData.data.aiScore}`)

    // 4. Submit Low-Effort Report
    console.log('4. Submitting low-effort report...')
    const lowEffortRes = await fetch(`${BASE_URL}/reports/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bhToken}`
        },
        body: JSON.stringify({
            programId: 'atlas-bridge-smart-contracts',
            title: 'Low effort',
            severity: 'LOW',
            target: 'test',
            summary: 'Too short',
            impact: 'None',
            proof: 'No proof',
            reporterName: 'Spammer'
        })
    })
    const leData = await lowEffortRes.json() as any
    if (!leData.success) {
        console.log(`   Low-effort report correctly identified. Error: ${leData.error}`)
    } else {
        console.log(`   Report submitted. Status: ${leData.data.status}`)
    }

    // 5. Validate High-Quality Report (Accept)
    console.log('5. Validating high-quality report as Organization...')
    const validateRes = await fetch(`${BASE_URL}/reports/${hqReportId}/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orgToken}`
        },
        body: JSON.stringify({
            action: 'ACCEPT',
            notes: 'Confirmed by our internal team. Excellent finding.'
        })
    })
    const validData = await validateRes.json() as any
    console.log(`   Final status: ${validData.data.status}, Decision: ${validData.data.validationDecision}`)

    console.log('--- Verification Complete ---')
}

test().catch(console.error)
