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
        'surface-card signal-card rounded-[28px] p-5 md:p-6',
        accent ? 'border-[rgba(56,217,178,0.2)]' : '',
        className,
      ].join(' ')}
      style={accent ? { boxShadow: `0 18px 38px ${accent}1f, inset 0 0 0 1px ${accent}2f` } : undefined}
    >
      <p className="section-kicker !tracking-[0.22em]">{label}</p>
      <h3 className="mt-4 text-3xl font-extrabold tracking-[-0.05em] text-[var(--text)] md:text-[2.2rem]">{value}</h3>
      {note && <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{note}</p>}
    </div>
  )
}
