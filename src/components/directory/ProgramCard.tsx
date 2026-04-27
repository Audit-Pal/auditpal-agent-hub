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
      className="group relative cursor-pointer rounded-[26px] border border-[rgba(255,255,255,0.09)] bg-[rgba(9,15,22,0.34)] p-5 backdrop-blur-[16px] transition duration-300 hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(12,19,28,0.44)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 pb-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(15,202,138,0.2)] bg-[linear-gradient(135deg,rgba(15,202,138,0.2),rgba(15,202,138,0.05))] text-lg font-extrabold text-[#0fca8a]">
            {program.logoMark}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-['Fraunces',serif] text-2xl font-semibold leading-tight tracking-tight text-[var(--text)] transition group-hover:text-[#0fca8a]">
              {program.name}
            </h3>
            <p className="mt-1 truncate text-sm text-[var(--text-soft)]">{program.company}</p>
          </div>
        </div>

        <div className="text-left md:min-w-[180px] md:text-right">
          <p className="text-3xl font-extrabold tracking-tight text-[var(--text)]">{formatUsd(program.maxBountyUsd)}</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">maximum payout</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.07)] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[11px] font-medium text-[var(--text-soft)]">
            {formatEnum(program.kind)}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(15,202,138,0.15)] bg-[rgba(15,202,138,0.05)] px-3 py-1 text-[11px] font-medium text-[#0fca8a]">
            {liveLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[11px] font-medium text-[var(--text-soft)]">
            {program.pocRequired ? 'PoC Required' : 'PoC Optional'}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(240,166,48,0.15)] bg-[rgba(240,166,48,0.05)] px-3 py-1 text-[11px] font-medium text-[#f0a630]">
            50 Credits
          </span>
        </div>

        <p className="text-[12px] text-[var(--text-muted)]">
          Launch Date: <span className="font-medium text-[var(--text-soft)]">{formatDate(program.startedAt)}</span>
        </p>
      </div>
    </article>
  )
}
