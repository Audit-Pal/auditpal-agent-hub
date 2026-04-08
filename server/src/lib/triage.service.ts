import { Severity } from '@prisma/client'

export interface ReportGraphContext {
    reporterAgent?: string
    vulnerabilityClass?: string
    affectedAsset?: string
    affectedComponent?: string
    attackVector?: string
    rootCause?: string
    prerequisites?: string
    referenceIds?: string[]
    transactionHashes?: string[]
    contractAddresses?: string[]
    repositoryLinks?: string[]
    filePaths?: string[]
    tags?: string[]
}

export interface ReportContent {
    title: string
    summary: string
    impact: string
    proof: string
    severity: Severity
    codeSnippet?: string
    errorLocation?: string
    graphContext?: ReportGraphContext
}

export interface EffortAssessment {
    isLowEffort: boolean
    reasons: string[]
}

export interface AiTriageResult {
    score: number
    summary: string
    route: string
    nextAction: string
}

const placeholderPhrases = ['test', 'lorem ipsum', 'tbd', 'none', 'n/a', 'no impact']

function countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length
}

function countOptionalList(value?: string[]) {
    return value?.filter(Boolean).length ?? 0
}

export function assessReportEffort(report: ReportContent): EffortAssessment {
    const reasons: string[] = []
    const normalizedNarrative = [report.title, report.summary, report.impact, report.proof].join(' ').toLowerCase()
    const totalWords = countWords(normalizedNarrative)

    if (report.title.trim().length < 8) {
        reasons.push('Title is too short to describe the issue clearly.')
    }

    if (report.summary.trim().length < 60) {
        reasons.push('Summary needs more detail about the vulnerable path.')
    }

    if (report.impact.trim().length < 40) {
        reasons.push('Impact needs a concrete security outcome.')
    }

    if (report.proof.trim().length < 40) {
        reasons.push('Proof needs replayable steps or stronger evidence.')
    }

    if (totalWords < 45) {
        reasons.push('The overall report is too short for triage.')
    }

    if (placeholderPhrases.some((phrase) => normalizedNarrative.includes(phrase)) && totalWords < 90) {
        reasons.push('The report still contains placeholder or non-actionable wording.')
    }

    return {
        isLowEffort: reasons.length > 0,
        reasons,
    }
}

export function isLowEffort(report: ReportContent): boolean {
    return assessReportEffort(report).isLowEffort
}

export async function runAiTriage(report: ReportContent): Promise<AiTriageResult> {
    const totalNarrativeLength = report.summary.length + report.impact.length + report.proof.length
    const graphContext = report.graphContext

    const contextSignals = [
        graphContext?.vulnerabilityClass,
        graphContext?.affectedAsset,
        graphContext?.affectedComponent,
        graphContext?.attackVector,
        graphContext?.rootCause,
        graphContext?.prerequisites,
    ].filter(Boolean).length

    const referenceSignals =
        countOptionalList(graphContext?.referenceIds) +
        countOptionalList(graphContext?.transactionHashes) +
        countOptionalList(graphContext?.contractAddresses) +
        countOptionalList(graphContext?.repositoryLinks) +
        countOptionalList(graphContext?.filePaths) +
        countOptionalList(graphContext?.tags)

    const severityWeight: Record<Severity, number> = {
        LOW: 4,
        MEDIUM: 8,
        HIGH: 14,
        CRITICAL: 20,
    }

    let score = 42
    score += Math.min(18, totalNarrativeLength / 120)
    score += severityWeight[report.severity]
    score += Math.min(16, contextSignals * 3)
    score += Math.min(10, referenceSignals * 2)

    if (report.codeSnippet?.trim()) score += 6
    if (report.errorLocation?.trim()) score += 4

    score = Math.max(0, Math.min(100, Math.round(score * 10) / 10))

    const detailLabel =
        score >= 85
            ? 'high-confidence'
            : score >= 70
              ? 'well-structured'
              : 'actionable'

    const route =
        report.severity === 'CRITICAL' || report.severity === 'HIGH' || score >= 82
            ? 'Priority organization validator queue'
            : 'Organization validator queue'

    const contextSummary = graphContext?.vulnerabilityClass
        ? 'Vulnerability class: ' + graphContext.vulnerabilityClass + '.'
        : 'Vulnerability class was not explicitly labeled.'

    return {
        score,
        route,
        nextAction: 'Awaiting organization human validation after AI triage.',
        summary:
            'AI triage marked this as a ' +
            detailLabel +
            ' ' +
            report.severity.toLowerCase() +
            ' report. ' +
            contextSummary,
    }
}
