interface MetricCardProps {
  label: string
  value: string | number
  note?: string
  accent?: string
  className?: string
}

export function MetricCard({ label, value, note, accent, className = '' }: MetricCardProps) {
  return (
    <div
      className={[
        'content-auto contain-paint py-5 border-b border-[rgba(255,255,255,0.06)] last:border-0',
        accent ? 'pl-3 border-l-2 border-l-[var(--accent)]' : '',
        className,
      ].join(' ')}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
      <h3 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{value}</h3>
      {note ? <p className="mt-3 text-xs leading-relaxed text-[var(--text-soft)]">{note}</p> : null}
    </div>
  )
}
