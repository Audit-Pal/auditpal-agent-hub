import React from 'react'

interface BreadcrumbsProps {
  items: { label: string; onClick?: () => void }[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#7b7468]">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <span className="text-[#b5ad9f]">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="transition-colors hover:text-[#171717]">
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-[#171717]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
