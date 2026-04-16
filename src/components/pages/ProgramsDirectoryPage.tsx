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
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={stagger.item} className="hero-card rounded-3xl p-7 md:p-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_300px]">
          <div>
            <p className="section-kicker">Directory</p>
            <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.8rem)] leading-tight text-[var(--text)]">
              Bounty programs.
            </h1>
            <p className="section-copy mt-4 max-w-2xl">
              Filter by platform, kind, and reward band.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="summary-chip">{filteredPrograms.length} programs</span>
              <span className="summary-chip">{totalRewardSurface} total</span>
            </div>
          </div>
        </div>
      </motion.section>



      <motion.div variants={stagger.item}>
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
      </motion.div>

      {filteredPrograms.length === 0 ? (
        <motion.section variants={stagger.item} className="surface-card-strong rounded-3xl p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] border border-[rgba(0,212,168,0.2)] mx-auto mb-5">
            <svg className="h-7 w-7 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <h2 className="font-serif text-3xl text-[var(--text)]">No matches.</h2>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[var(--text-soft)]">
            Clear filters and widen your search.
          </p>
          <Button variant="outline" size="md" className="mt-6" onClick={clearFilters}>
            Clear filters
          </Button>
        </motion.section>
      ) : (
        <motion.div variants={stagger.container} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredPrograms.map((program) => (
            <motion.div key={program.id} variants={stagger.item}>
              <ProgramCard program={program} onClick={() => navigate('/bounty/' + program.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
