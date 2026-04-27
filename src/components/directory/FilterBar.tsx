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
    <section className="rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[rgba(9,14,20,0.32)] p-5 backdrop-blur-[16px] lg:min-h-[600px]">
      <div className="flex flex-col gap-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#7f8896]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search programs..."
            className="w-full rounded-[14px] border border-[rgba(255,255,255,0.11)] bg-[rgba(5,8,12,0.42)] py-3 pl-11 pr-4 text-[14px] text-[#eef1f6] transition hover:border-[rgba(15,202,138,0.32)] focus:border-[#0fca8a] focus:outline-none"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f8896] mb-2">Kind</label>
            <select value={kind} onChange={(event) => onKindChange(event.target.value)} className="w-full rounded-[14px] border border-[rgba(255,255,255,0.11)] bg-[rgba(5,8,12,0.42)] px-3 py-2.5 text-[14px] text-[#eef1f6] outline-none">
              <option value="All kinds">All kinds</option>
              {kinds.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f8896] mb-2">Category</label>
            <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="w-full rounded-[14px] border border-[rgba(255,255,255,0.11)] bg-[rgba(5,8,12,0.42)] px-3 py-2.5 text-[14px] text-[#eef1f6] outline-none">
              <option value="All categories">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f8896] mb-2">Platform</label>
            <select value={platform} onChange={(event) => onPlatformChange(event.target.value)} className="w-full rounded-[14px] border border-[rgba(255,255,255,0.11)] bg-[rgba(5,8,12,0.42)] px-3 py-2.5 text-[14px] text-[#eef1f6] outline-none">
              <option value="All platforms">All platforms</option>
              {platforms.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f8896] mb-2">Sort By</label>
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="w-full rounded-[14px] border border-[rgba(255,255,255,0.11)] bg-[rgba(5,8,12,0.42)] px-3 py-2.5 text-[14px] text-[#eef1f6] outline-none">
              <option value="recent">Most recently updated</option>
              <option value="bounty">Highest reward</option>
              <option value="reviews">Most reviewed</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
        <p className="text-[13px] text-[#7f8896]">{resultCount} bounties</p>
        <button
          onClick={onClear}
          className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0fca8a] hover:opacity-80 transition"
        >
          Reset Filters
        </button>
      </div>
    </section>
  )
}
