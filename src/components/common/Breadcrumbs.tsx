import React from 'react'

interface BreadcrumbsProps {
  items: { label: string; onClick?: () => void }[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <span className="text-[rgba(151,203,200,0.22)]">/</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="rounded-full border border-transparent px-3 py-1.5 transition hover:border-[rgba(56,217,178,0.18)] hover:bg-[rgba(9,18,27,0.72)] hover:text-[var(--text)]"
            >
              {item.label}
            </button>
          ) : (
            <span className="rounded-full border border-[var(--border)] bg-[rgba(9,18,27,0.78)] px-3 py-1.5 font-semibold text-[var(--text)]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
