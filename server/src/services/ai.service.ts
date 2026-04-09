import { ReportContent } from '../lib/triage.service'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-live-preview:generateContent'

export interface AiAuditRequest {
    code?: string
    description?: string
    context?: string
}

export async function generateFinding(req: AiAuditRequest): Promise<Partial<ReportContent>> {
    const prompt = `
        You are an expert security researcher and auditor. 
        Analyze the following code or description and identify a potential security vulnerability.
        
        ${req.code ? `CODE SNIPPET:\n${req.code}\n` : ''}
        ${req.description ? `DESCRIPTION:\n${req.description}\n` : ''}
        ${req.context ? `ADDITIONAL CONTEXT:\n${req.context}\n` : ''}
        
        RETURN ONLY A VALID JSON OBJECT in the following format:
        {
            "title": "Clear, concise title of the vulnerability",
            "severity": "CRITICAL", "HIGH", "MEDIUM", or "LOW",
            "summary": "Detailed technical explanation of what is wrong",
            "impact": "Realistic security impact of this vulnerability",
            "proof": "Step-by-step instructions or PoC to reproduce the issue",
            "vulnerabilityClass": "Class of vulnerability (e.g., Reentrancy, Access Control, Logic Error)",
            "attackVector": "How an attacker would exploit this",
            "rootCause": "The underlying mistake in code or design"
        }
        
        DO NOT include any markdown formatting, backticks, or extra text. Return ONLY the JSON object.
    `

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                },
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Gemini API error:', JSON.stringify(errorData, null, 2))
            throw new Error(`Gemini API error: ${response.statusText}`)
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            throw new Error('Empty response from Gemini')
        }

        const parsedContent = JSON.parse(text)

        return {
            title: parsedContent.title,
            severity: parsedContent.severity,
            summary: parsedContent.summary,
            impact: parsedContent.impact,
            proof: parsedContent.proof,
            graphContext: {
                vulnerabilityClass: parsedContent.vulnerabilityClass,
                attackVector: parsedContent.attackVector,
                rootCause: parsedContent.rootCause,
            },
        }
    } catch (error) {
        console.error('Failed to generate finding with AI:', error)
        throw error
    }
}
