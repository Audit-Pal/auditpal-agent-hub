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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Featured bounties</p>
          <h2 className="mt-3 font-serif text-4xl text-[#171717] md:text-5xl">Start with bounties researchers notice first.</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[#5f5a51]">
          These bounties have clear scope, meaningful rewards, and strong operational detail, which makes them good anchors for a serious marketplace homepage.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {programs.map((program) => (
          <article
            key={program.id}
            onClick={() => onProgramClick(program.id)}
            className="cursor-pointer rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_48px_rgba(30,24,16,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#171717]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] text-base font-semibold text-[#171717]">
                {program.logoMark}
              </div>
              <Badge tone="soft">{formatEnum(program.kind)}</Badge>
            </div>

            <h3 className="mt-5 font-serif text-3xl leading-tight text-[#171717] line-clamp-1">{program.name}</h3>
            <p className="mt-2 text-sm text-[#6f695f]">{program.company}</p>
            <p className="mt-4 text-sm leading-7 text-[#4b463f] line-clamp-2">{program.tagline}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(program.platforms || []).slice(0, 3).map((platform) => (
                <Badge key={platform} tone="soft">
                  {formatEnum(platform)}
                </Badge>
              ))}
            </div>

            <div className="mt-6 border-t border-[#ebe4d8] pt-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Maximum bounty</p>
              <p className="mt-2 text-3xl font-semibold text-[#171717]">
                {formatUsd(program.maxBountyUsd)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
