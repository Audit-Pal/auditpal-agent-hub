import type { ReactNode } from 'react'

interface HeroStat {
  label: string
  value: string
  tone?: 'default' | 'accent' | 'soft'
}

interface PageHeroProps {
  eyebrow?: string
  title: string
  description: string
  stats?: readonly HeroStat[]
  aside?: ReactNode
}

function getValueToneClass(tone: HeroStat['tone']) {
  switch (tone) {
    case 'accent':
      return 'text-[#12f4a6]'
    case 'soft':
      return 'text-[#8fd4ff]'
    default:
      return 'text-[#eef1f6]'
  }
}

export function PageHero({
  eyebrow = 'Intelligence Hub',
  title,
  description,
  stats = [],
  aside,
}: PageHeroProps) {
  return (
    <section className="relative w-full overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.045)] bg-[linear-gradient(145deg,rgba(13,25,34,0.48),rgba(9,16,24,0.32))] shadow-[0_12px_36px_rgba(0,0,0,0.08)] backdrop-blur-[14px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,202,138,0.08),transparent_44%),radial-gradient(circle_at_82%_18%,rgba(77,159,255,0.06),transparent_34%)]" />
      <div className="absolute inset-y-0 right-[16%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.035),transparent)] xl:block" />

      <div className="relative grid gap-8 px-6 py-8 md:px-8 md:py-10 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] xl:px-10 xl:py-12">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,202,138,0.14)] bg-[rgba(15,202,138,0.05)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fca8a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0fca8a] animate-pulse" />
            {eyebrow}
          </div>

          <h1 className="mt-6 max-w-4xl font-['Fraunces',serif] text-4xl leading-[1.02] tracking-tight text-[#eef1f6] sm:text-5xl xl:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#8a95a4] md:text-[16px]">
            {description}
          </p>
        </div>

        {(stats.length > 0 || aside) && (
          <div className="relative z-10 flex flex-col gap-4 self-end xl:items-stretch">
            {stats.length > 0 && (
              <div
                className={[
                  'grid gap-4',
                  stats.length >= 3 ? 'sm:grid-cols-2 2xl:grid-cols-3' : stats.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1',
                ].join(' ')}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-[rgba(255,255,255,0.045)] bg-[rgba(7,12,18,0.22)] p-5 backdrop-blur-[10px]"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7f8896]">{stat.label}</p>
                    <p className={`mt-3 text-2xl font-bold tracking-tight ${getValueToneClass(stat.tone)}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
            {aside}
          </div>
        )}
      </div>
    </section>
  )
}
