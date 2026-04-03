import type { TriageStage } from '../../types/platform'

interface TriageVisualizerProps {
    stages: readonly TriageStage[]
}

export function TriageVisualizer({ stages }: TriageVisualizerProps) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Triage pipeline</p>
          <h3 className="mt-3 font-serif text-4xl text-[#171717]">How reports move from intake to decision.</h3>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
          The design stays text-heavy on purpose so the workflow feels operational and readable instead of decorative.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <article key={stage.title} className="rounded-[28px] border border-[#ebe4d8] bg-[#fbf8f2] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">{stage.automation}</span>
            </div>
            <h4 className="mt-5 text-xl font-semibold text-[#171717]">{stage.title}</h4>
            <p className="mt-2 text-sm text-[#6f695f]">{stage.owner}</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f]">{stage.trigger}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
