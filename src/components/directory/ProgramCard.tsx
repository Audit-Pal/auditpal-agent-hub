import type { Program } from '../../types/platform'
import { Badge } from '../common/Badge'

interface ProgramCardProps {
  program: Program
  onClick: () => void
}

export function ProgramCard({ program, onClick }: ProgramCardProps) {
  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <article
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-[30px] border border-[#d9d1c4] bg-[#fffdf8] p-6 shadow-[0_16px_48px_rgba(30,24,16,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#171717]"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(243,239,230,0.7),rgba(243,239,230,0))]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9d1c4] bg-[#f6f2ea] text-lg font-semibold text-[#171717]">
            {program.logoMark}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-3xl leading-none text-[#171717] transition group-hover:text-[#315e50]">
                {program.name}
              </h3>
              {program.isNew && <Badge tone="new">New</Badge>}
            </div>
            <p className="mt-2 text-sm text-[#6f695f]">
              {program.company} · {program.kind}
            </p>
          </div>
        </div>

        <div className="rounded-full border border-[#ebe4d8] bg-[#fbf8f2] px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Updated</p>
          <p className="mt-1 text-sm text-[#171717]">{program.updatedAt}</p>
        </div>
      </div>

      <p className="relative mt-6 text-base leading-8 text-[#4b463f]">{program.description}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Max reward</p>
          <p className="mt-2 text-2xl font-semibold text-[#171717]">{formatUsd(program.maxBountyUsd)}</p>
        </div>
        <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Response SLA</p>
          <p className="mt-2 text-2xl font-semibold text-[#171717]">{program.header.responseSla}</p>
        </div>
        <div className="rounded-[24px] border border-[#ebe4d8] bg-[#fbf8f2] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Scope targets</p>
          <p className="mt-2 text-2xl font-semibold text-[#171717]">{program.scopeTargets.length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe4d8] pt-5">
        <div className="flex flex-wrap gap-2">
          {program.platforms.slice(0, 3).map((platform) => (
            <Badge key={platform} tone="soft">
              {platform}
            </Badge>
          ))}
          {program.languages.slice(0, 2).map((language) => (
            <Badge key={language} tone="soft">
              {language}
            </Badge>
          ))}
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b7468]">Reviews tracked</p>
          <p className="mt-1 text-sm text-[#171717]">{program.scopeReviews.toLocaleString()}</p>
        </div>
      </div>
    </article>
  )
}
