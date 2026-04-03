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
  const selectClassName =
    'min-w-[170px] rounded-full border border-[#d9d1c4] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#171717]'

  return (
    <section className="rounded-[32px] border border-[#d9d1c4] bg-[#fffdf8] p-5 shadow-[0_16px_48px_rgba(30,24,16,0.06)] md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">Program atlas</p>
          <p className="mt-2 text-sm leading-7 text-[#5f5a51]">
            Search by product, company, or tech stack, then narrow the list by surface, program type, and chain.
          </p>
        </div>
        <div className="rounded-full border border-[#ebe4d8] bg-[#fbf8f2] px-4 py-2 text-sm text-[#5f5a51]">
          {resultCount} matching programs
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,180px))]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8f897d]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search protocols, companies, or technologies"
            className="w-full rounded-full border border-[#d9d1c4] bg-white py-3 pl-11 pr-4 text-sm text-[#171717] outline-none transition placeholder:text-[#989286] focus:border-[#171717]"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <select value={kind} onChange={(event) => onKindChange(event.target.value)} className={selectClassName}>
          <option value="All kinds">All kinds</option>
          {kinds.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className={selectClassName}>
          <option value="All categories">All categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={platform} onChange={(event) => onPlatformChange(event.target.value)} className={selectClassName}>
          <option value="All platforms">All platforms</option>
          {platforms.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className={selectClassName}>
          <option value="recent">Most recently updated</option>
          <option value="bounty">Highest reward</option>
          <option value="reviews">Most reviewed</option>
          <option value="name">Alphabetical</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe4d8] pt-4">
        <p className="text-sm text-[#6f695f]">
          Fast triage, explicit scope, and cleaner submission rules help this feel closer to a production program directory.
        </p>
        <button
          onClick={onClear}
          className="rounded-full border border-[#d9d1c4] px-4 py-2 text-sm text-[#171717] transition hover:border-[#171717]"
        >
          Clear filters
        </button>
      </div>
    </section>
  )
}
