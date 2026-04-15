import type { Program } from '../../types/platform'
import { Badge } from '../common/Badge'
import { formatEnum, formatUsd } from '../../utils/formatters'

interface HiddenGemsProps {
  programs: Program[]
  onProgramClick: (id: string) => void
}

export function HiddenGems({ programs, onProgramClick }: HiddenGemsProps) {
  if (programs.length === 0) return null

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Featured programs</p>
          <h2 className="mt-3 font-serif text-4xl text-[var(--text)] md:text-5xl">Start with the programs researchers notice first.</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--text-soft)]">
          These are strong starting points when you want visible scope, meaningful rewards, and enough policy detail to move confidently.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {programs.map((program) => (
          <article
            key={program.id}
            onClick={() => onProgramClick(program.id)}
            className="surface-card-strong signal-card cursor-pointer rounded-[30px] p-6 transition duration-200 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(56,217,178,0.2)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-base font-extrabold text-[#021614] shadow-[0_14px_28px_rgba(30,186,152,0.2)]">
                {program.logoMark}
              </div>
              <Badge tone="soft">{formatEnum(program.kind)}</Badge>
            </div>

            <h3 className="mt-5 font-serif text-3xl leading-tight text-[var(--text)] line-clamp-1">{program.name}</h3>
            <p className="mt-2 text-sm text-[var(--text-soft)]">{program.company}</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)] line-clamp-2">{program.tagline}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(program.platforms || []).slice(0, 3).map((platform) => (
                <Badge key={platform} tone="accent">
                  {formatEnum(platform)}
                </Badge>
              ))}
            </div>

            <div className="subtle-divider mt-6 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Maximum bounty</p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
