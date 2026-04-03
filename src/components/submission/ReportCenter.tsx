import type { ResearcherReport } from '../../types/platform'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'

interface ReportCenterProps {
  reports: readonly ResearcherReport[]
  onBrowsePrograms: () => void
  onNewSubmission: () => void
  onOpenProgram: (programId: string) => void
}

const statusTone: Record<ResearcherReport['status'], 'new' | 'soft' | 'accent' | 'success'> = {
  Submitted: 'new',
  'Needs info': 'soft',
  Triaged: 'accent',
  Resolved: 'success',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ReportCenter({
  reports,
  onBrowsePrograms,
  onNewSubmission,
  onOpenProgram,
}: ReportCenterProps) {
  const totalReports = reports.length
  const triagedReports = reports.filter((report) => report.status === 'Triaged' || report.status === 'Resolved').length
  const uniquePrograms = new Set(reports.map((report) => report.programId)).size
  const latestReport = reports[0]

  if (reports.length === 0) {
    return (
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)] md:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Report center</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none text-[#171717] md:text-6xl">
          Track every finding from the same workspace.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f5a51]">
          This view becomes useful as soon as you submit your first report. We store submissions locally so you can test the full researcher flow end to end.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" size="md" onClick={onNewSubmission}>
            Submit a report
          </Button>
          <Button variant="outline" size="md" onClick={onBrowsePrograms}>
            Browse programs
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-[#d9d1c4] bg-[#fffdf8] p-8 shadow-[0_20px_60px_rgba(30,24,16,0.08)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b7468]">Report center</p>
            <h1 className="mt-4 font-serif text-5xl leading-none text-[#171717] md:text-6xl">
              Your reports, status changes, and next steps.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f5a51]">
              This is the working front-end researcher inbox. Every report submitted in the modal appears here with its program, severity, route, and expected response window.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="md" onClick={onBrowsePrograms}>
              Browse programs
            </Button>
            <Button variant="primary" size="md" onClick={onNewSubmission}>
              New report
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Reports submitted</p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{totalReports}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Already triaged</p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{triagedReports}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Programs touched</p>
            <p className="mt-3 text-4xl font-semibold text-[#171717]">{uniquePrograms}</p>
          </article>
          <article className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Latest activity</p>
            <p className="mt-3 text-lg font-semibold text-[#171717]">{latestReport ? formatDate(latestReport.submittedAt) : 'No activity yet'}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="soft">{report.id}</Badge>
                    <Badge
                      tone={
                        report.severity === 'Critical'
                          ? 'critical'
                          : report.severity === 'High'
                            ? 'high'
                            : report.severity === 'Medium'
                              ? 'medium'
                              : 'low'
                      }
                    >
                      {report.severity}
                    </Badge>
                    <Badge tone={statusTone[report.status]}>{report.status}</Badge>
                  </div>
                  <h2 className="mt-4 font-serif text-3xl leading-tight text-[#171717]">{report.title}</h2>
                  <button
                    onClick={() => onOpenProgram(report.programId)}
                    className="mt-2 text-sm font-medium text-[#315e50] transition hover:text-[#171717]"
                  >
                    {report.programName} · {report.programCode}
                  </button>
                  <p className="mt-4 text-sm leading-7 text-[#4b463f]">{report.summary}</p>
                </div>

                <div className="min-w-[220px] rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">Next action</p>
                  <p className="mt-2 text-sm leading-7 text-[#171717]">{report.nextAction}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Target</p>
                  <p className="mt-2 text-sm text-[#171717]">{report.target}</p>
                </div>
                <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Route</p>
                  <p className="mt-2 text-sm text-[#171717]">{report.route}</p>
                </div>
                <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Submitted</p>
                  <p className="mt-2 text-sm text-[#171717]">{formatDate(report.submittedAt)}</p>
                </div>
                <div className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Response SLA</p>
                  <p className="mt-2 text-sm text-[#171717]">{report.responseSla}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[26px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Impact and proof notes</p>
                <p className="mt-3 text-sm leading-7 text-[#4b463f]">
                  <span className="font-medium text-[#171717]">Impact:</span> {report.impact}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#4b463f]">
                  <span className="font-medium text-[#171717]">Proof:</span> {report.proof}
                </p>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">How this flow works</p>
            <div className="mt-4 space-y-3">
              {[
                'Choose a program and create a structured submission.',
                'The local inbox records the report immediately after submission.',
                'Program response expectations remain visible while you review details.',
              ].map((item, index) => (
                <div key={item} className="rounded-2xl border border-[#ebe4d8] bg-[#fbf8f2] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-7 text-[#4b463f]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_50px_rgba(30,24,16,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Researcher note</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">
              For now this is a front-end MVP, so reports stay in local storage rather than a database. The important part is that the entire UX is now testable from discovery to submission to report tracking.
            </p>
          </section>
        </aside>
      </section>
    </div>
  )
}
