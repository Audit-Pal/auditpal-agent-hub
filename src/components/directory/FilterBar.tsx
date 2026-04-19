interface FilterBarProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  category: string
  kind: string
  platform: string
  sortBy: string
  categories: readonly string[]
  kinds: readonly string[]
  platforms: readonly string[]
  onCategoryChange: (value: string) => void
  onKindChange: (value: string) => void
  onPlatformChange: (value: string) => void
  onSortChange: (value: string) => void
  onClear: () => void
  resultCount: number
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  category,
  kind,
  platform,
  sortBy,
  categories,
  kinds,
  platforms,
  onCategoryChange,
  onKindChange,
  onPlatformChange,
  onSortChange,
  onClear,
  resultCount,
}: FilterBarProps) {
  return (
    <section className="surface-card-strong rounded-[28px] p-4 md:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,180px))]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--text-muted)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search opportunities"
            className="field !rounded-[22px] !pl-11"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <select value={kind} onChange={(event) => onKindChange(event.target.value)} className="field-select !rounded-[22px]">
          <option value="All kinds">All kinds</option>
          {kinds.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="field-select !rounded-[22px]">
          <option value="All categories">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={platform} onChange={(event) => onPlatformChange(event.target.value)} className="field-select !rounded-[22px]">
          <option value="All platforms">All platforms</option>
          {platforms.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="field-select !rounded-[22px]">
          <option value="recent">Most recently updated</option>
          <option value="bounty">Highest reward</option>
          <option value="reviews">Most reviewed</option>
          <option value="name">Alphabetical</option>
        </select>
      </div>

      <div className="subtle-divider mt-4 flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="text-sm text-[var(--text-soft)]">{resultCount} bounties</p>
        <button
          onClick={onClear}
          className="rounded-full border border-[var(--border)] bg-[rgba(9,18,27,0.78)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[rgba(56,217,178,0.32)] hover:bg-[rgba(13,26,37,0.94)] hover:text-[var(--accent-strong)]"
        >
          Clear filters
        </button>
      </div>
    </section>
  )
}
