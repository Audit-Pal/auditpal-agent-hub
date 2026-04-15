import type { Program } from '../../types/platform'
import { Badge } from '../common/Badge'
import { formatEnum, formatUsd } from '../../utils/formatters'

interface ProgramCardProps {
  program: Program
  onClick: () => void
}

export function ProgramCard({ program, onClick }: ProgramCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <article
      onClick={onClick}
      className="surface-card-strong signal-card group relative cursor-pointer overflow-hidden rounded-[32px] p-6 transition duration-200 hover:-translate-y-1"
    >
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(30,186,152,0.16),transparent_70%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[rgba(56,217,178,0.2)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-lg font-extrabold text-[#021614] shadow-[0_18px_34px_rgba(30,186,152,0.2)]">
            {program.logoMark}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-3xl leading-none text-[var(--text)] transition group-hover:text-[var(--accent-strong)]">
                {program.name}
              </h3>
              {program.isNew && <Badge tone="new">New</Badge>}
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              {program.company} · {formatEnum(program.kind)}
            </p>
          </div>
        </div>

        <div className="rounded-full border border-[rgba(116,145,153,0.16)] bg-[rgba(7,15,22,0.88)] px-3 py-2 text-right shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Updated</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">{formatDate(program.updatedAt)}</p>
        </div>
      </div>

      <p className="relative mt-6 text-base leading-8 text-[var(--text-soft)] line-clamp-3">{program.description}</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="surface-card-muted rounded-[24px] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Max reward</p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
        </div>
        <div className="surface-card-muted rounded-[24px] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Response SLA</p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{program.responseSla}</p>
        </div>
        <div className="surface-card-muted rounded-[24px] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Scope targets</p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{(program.scopeTargets || []).length}</p>
        </div>
      </div>

      <div className="subtle-divider mt-6 flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex flex-wrap gap-2">
          {(program.platforms || []).slice(0, 3).map((platform) => (
            <Badge key={platform} tone="soft">
              {formatEnum(platform)}
            </Badge>
          ))}
          {(program.languages || []).slice(0, 2).map((language) => (
            <Badge key={language} tone="accent">
              {formatEnum(language)}
            </Badge>
          ))}
        </div>

        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Reviews tracked</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">{program.scopeReviews.toLocaleString()}</p>
        </div>
      </div>
    </article>
  )
}
