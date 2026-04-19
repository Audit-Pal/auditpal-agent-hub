import type { KeyboardEvent } from 'react'
import type { Program } from '../../types/platform'
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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  const liveLabel = program.status === 'ACTIVE' ? 'Live' : formatEnum(program.status)

  return (
    <article
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="surface-card-strong group relative cursor-pointer overflow-hidden rounded-[28px] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(56,217,178,0.24)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 px-5 py-5 md:px-6 md:py-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[rgba(56,217,178,0.2)] bg-[linear-gradient(135deg,rgba(30,186,152,1),rgba(7,79,70,0.94))] text-lg font-extrabold text-[#021614] shadow-[0_14px_28px_rgba(30,186,152,0.18)]">
            {program.logoMark}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[clamp(1.35rem,2vw,2rem)] font-semibold leading-tight text-[var(--text)] transition group-hover:text-[var(--accent-strong)]">
              {program.name}
            </h3>
            <p className="mt-1 truncate text-sm text-[var(--text-soft)]">{program.company}</p>
          </div>
        </div>

        <div className="text-left md:min-w-[180px] md:text-right">
          <p className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">in {program.payoutCurrency}</p>
        </div>
      </div>

      <div className="subtle-divider flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[rgba(16,31,43,0.72)] px-3 py-1 text-xs font-medium text-[var(--text)]">
            {formatEnum(program.kind)}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(142,240,191,0.18)] bg-[var(--success-soft)] px-3 py-1 text-xs font-medium text-[var(--success-text)]">
            {liveLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[rgba(16,31,43,0.72)] px-3 py-1 text-xs font-medium text-[var(--text)]">
            {program.pocRequired ? 'PoC required' : 'PoC optional'}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(255,159,67,0.18)] bg-[rgba(255,159,67,0.12)] px-3 py-1 text-xs font-medium text-[#ff9f43]">
            50 Credits required
          </span>
        </div>

        <p className="text-sm text-[var(--text-soft)]">
          Started on <span className="font-medium text-[var(--text)]">{formatDate(program.startedAt)}</span>
        </p>
      </div>
    </article>
  )
}
