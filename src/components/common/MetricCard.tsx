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
        'relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[rgba(10,20,30,0.6)] p-6 backdrop-blur-md transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group',
        accent ? 'border-[rgba(0,212,168,0.2)]' : '',
        className,
      ].join(' ')}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <div className="h-8 w-8 rounded-full border border-dashed border-[var(--text-muted)] group-hover:animate-spin" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)] mb-4">{label}</p>
      <h3 className="text-4xl font-extrabold tracking-tighter text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{value}</h3>
      {note && (
        <p className="mt-4 text-xs font-medium leading-relaxed text-[var(--text-soft)] italic opacity-60 border-l border-[var(--border)] pl-4">
          {note}
        </p>
      )}
    </div>
  )
}
