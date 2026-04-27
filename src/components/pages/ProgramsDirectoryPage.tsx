import { m as motion } from 'framer-motion'
import { Button } from '../common/Button'
import { FilterBar } from '../directory/FilterBar'
import { ProgramCard } from '../directory/ProgramCard'
import type { Program, ProgramKind } from '../../types/platform'
import { PageHero } from '../common/PageHero'

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
      <motion.div variants={stagger.item}>
        <PageHero
          title="Active Bounties"
          description="Discover high-signal programs, compare reward surface at a glance, and jump straight into the bounty streams worth your time."
          stats={[
            { label: 'Total Reward Surface', value: totalRewardSurface, tone: 'accent' },
            { label: 'Live Programs', value: `${filteredPrograms.length} Active` },
          ]}
        />
      </motion.div>

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
            <motion.div variants={stagger.container} className="flex flex-col gap-5 w-full">
              {filteredPrograms.map((program) => (
                <motion.div key={program.id} variants={stagger.item}>
                  <ProgramCard program={program} onClick={() => navigate('/bounty/' + program.id)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>
    </motion.div>
  )
}
