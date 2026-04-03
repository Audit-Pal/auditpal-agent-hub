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
      className={`rounded-[26px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_12px_36px_rgba(30,24,16,0.05)] ${className}`}
      style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}30` } : undefined}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">{label}</p>
      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#171717]">{value}</h3>
      {note && <p className="mt-2 text-sm leading-6 text-[#6f695f]">{note}</p>}
    </div>
  )
}
