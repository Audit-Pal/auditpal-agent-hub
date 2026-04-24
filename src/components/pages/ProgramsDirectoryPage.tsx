import { m as motion } from 'framer-motion'
import { Button } from '../common/Button'
import { FilterBar } from '../directory/FilterBar'
import { ProgramCard } from '../directory/ProgramCard'
import type { Program, ProgramKind } from '../../types/platform'

interface ProgramsDirectoryPageProps {
  navigate: (path: string) => void
  searchQuery: string
  selectedKind: string
  selectedCategory: string
  selectedPlatform: string
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (cat: string) => void
  setSelectedKind: (kind: string) => void
  setSelectedPlatform: (p: string) => void
  setSortBy: (s: any) => void
  sortBy: string
  categories: string[]
  kinds: ProgramKind[]
  platforms: string[]
  filteredPrograms: Program[]
}

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } } },
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProgramsDirectoryPage({
  navigate,
  searchQuery,
  selectedKind,
  selectedCategory,
  selectedPlatform,
  clearFilters,
  setSearchQuery,
  setSelectedCategory,
  setSelectedKind,
  setSelectedPlatform,
  setSortBy,
  sortBy,
  categories,
  kinds,
  platforms,
  filteredPrograms,
}: ProgramsDirectoryPageProps) {
  const totalRewardSurface = formatUsd(filteredPrograms.reduce((total, program) => total + program.maxBountyUsd, 0))

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-2 lg:space-y-4">
      <motion.section variants={stagger.item} className="pb-4 mb-4 border-b border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 pt-2 pb-4 lg:pt-4 lg:pb-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.22)] bg-[rgba(15,202,138,0.08)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0fca8a] mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
              Intelligence Hub
            </div>
            <h1 className="font-['Fraunces',serif] text-5xl lg:text-7xl tracking-tight text-[#eef1f6] leading-[1.1]">
              Active Bounties
            </h1>
            <p className="mt-4 text-[15px] lg:text-[16px] leading-[1.6] text-[#7f8896] max-w-xl">
              Discover and engage with priority security programs. Isolate vulnerabilities, provide insights, and earn performance-based rewards.
            </p>
          </div>

          <div className="flex gap-4 relative z-10 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none border border-[rgba(255,255,255,0.06)] bg-[#0a0d12] rounded-[16px] p-5 lg:min-w-[160px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f8896] font-bold mb-1">Total Reward Surface</p>
              <p className="text-2xl font-bold tracking-tight text-[#12f4a6]">{totalRewardSurface}</p>
            </div>
            <div className="flex-1 lg:flex-none border border-[rgba(255,255,255,0.06)] bg-[#0a0d12] rounded-[16px] p-5 lg:min-w-[140px]">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#7f8896] font-bold mb-1">Live Programs</p>
              <p className="text-2xl font-bold tracking-tight text-[#eef1f6]">{filteredPrograms.length} Active</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start mt-6">
        <motion.aside variants={stagger.item} className="w-full lg:w-[280px] shrink-0 sticky top-[80px]">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            category={selectedCategory}
            kind={selectedKind}
            platform={selectedPlatform}
            sortBy={sortBy}
            categories={categories}
            kinds={kinds}
            platforms={platforms}
            onCategoryChange={setSelectedCategory}
            onKindChange={setSelectedKind}
            onPlatformChange={setSelectedPlatform}
            onSortChange={(value) => setSortBy(value)}
            onClear={clearFilters}
            resultCount={filteredPrograms.length}
          />
        </motion.aside>

        <main className="w-full min-w-0 flex-1">
          {filteredPrograms.length === 0 ? (
            <motion.section variants={stagger.item} className="rounded-3xl p-12 text-center border-b border-[rgba(255,255,255,0.06)] mb-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(0,212,168,0.2)] bg-[var(--accent-soft)]">
                <svg className="h-7 w-7 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-[var(--text)]">No matches.</h2>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[var(--text-soft)]">Clear filters and widen your search.</p>
              <Button variant="outline" size="md" className="mt-6" onClick={clearFilters}>
                Clear filters
              </Button>
            </motion.section>
          ) : (
            <motion.div variants={stagger.container} className="flex flex-col w-full">
              {filteredPrograms.map((program, idx) => (
                <div key={program.id}>
                  {idx > 0 && <div className="h-px bg-[rgba(255,255,255,0.02)] my-4 mx-8" />}
                  <motion.div variants={stagger.item}>
                    <ProgramCard program={program} onClick={() => navigate('/bounty/' + program.id)} />
                  </motion.div>
                </div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </motion.div>
  )
}
