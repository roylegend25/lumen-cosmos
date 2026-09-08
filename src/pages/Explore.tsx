import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader2, Telescope, Compass, Star as StarIcon, Sparkles } from 'lucide-react'
import {
  assetUrl,
  bvToRGB,
  greekLetter,
  loadConstellations,
  loadNebulae,
  loadStars,
  type BrightStar,
  type Constellation,
  type Nebula,
} from '../lib/astro'

type Filter = 'all' | 'constellations' | 'stars' | 'deepsky'

export function Explore() {
  const [constellations, setConstellations] = useState<Constellation[] | null>(null)
  const [stars, setStars] = useState<BrightStar[] | null>(null)
  const [deepsky, setDeepsky] = useState<Nebula[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    loadConstellations().then(setConstellations).catch(() => setConstellations([]))
    loadStars().then(setStars).catch(() => setStars([]))
    loadNebulae().then(setDeepsky).catch(() => setDeepsky([]))
  }, [])

  const ready = constellations && stars && deepsky
  const q = query.trim().toLowerCase()

  const conHits = useMemo(() => {
    if (!constellations) return []
    if (!q) return constellations.slice(0, 12)
    return constellations
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.genitive.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      )
      .slice(0, 24)
  }, [constellations, q])

  const starHits = useMemo(() => {
    if (!stars) return []
    if (!q) return stars.slice(0, 12)
    return stars
      .filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.conName && s.conName.toLowerCase().includes(q)) ||
          (s.sp && s.sp.toLowerCase().includes(q)),
      )
      .slice(0, 24)
  }, [stars, q])

  const dsHits = useMemo(() => {
    if (!deepsky) return []
    if (!q) return deepsky.slice(0, 9)
    return deepsky.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.catalog.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.constellation.toLowerCase().includes(q),
    )
  }, [deepsky, q])

  if (!ready) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading catalogue…</span>
        </div>
      </div>
    )
  }

  const show = (f: Filter) => filter === 'all' || filter === f

  return (
    <div className="section-padding container-wide pt-24 pb-20">
      <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-3">
        Explore
      </p>
      <h1 className="text-[2rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#f0f0f8] mb-3">
        Explore the universe
      </h1>
      <p className="text-[#a0a0b8] max-w-2xl text-[15px] leading-relaxed mb-8">
        {constellations.length} constellations, {stars.length} catalogued stars and{' '}
        {deepsky.length} deep-sky objects imaged by NASA. All of it free.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything — Orion, Betelgeuse, planetary nebula…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                       text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                       focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
          />
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['all', 'constellations', 'stars', 'deepsky'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                filter === f ? 'bg-[#7c6aff] text-white' : 'text-[#a0a0b8] hover:text-[#f0f0f8]'
              }`}
            >
              {f === 'deepsky' ? 'Deep sky' : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Link
          to="/sky"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5
                     text-[13px] text-[#f0f0f8] hover:bg-white/[0.05] transition-colors"
        >
          <Telescope className="w-4 h-4 text-[#9b8cff]" /> Open sky
        </Link>
      </div>

      {show('deepsky') && dsHits.length > 0 && (
        <Section icon={<Sparkles className="w-4 h-4 text-[#9b8cff]" />} title="Deep sky" to="/nebulae">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dsHits.map((n) => (
              <Link
                key={n.slug}
                to={`/nebulae/${n.slug}`}
                className="group rounded-xl overflow-hidden border border-white/[0.07] hover:border-[#7c6aff]/40 transition-colors"
              >
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={assetUrl(n.image)}
                    alt={n.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="text-[14px] font-semibold text-[#f0f0f8]">{n.name}</h3>
                  <p className="text-[11px] text-[#a0a0b8] mt-0.5">
                    {n.catalog} · {n.type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {show('constellations') && conHits.length > 0 && (
        <Section icon={<Compass className="w-4 h-4 text-[#9b8cff]" />} title="Constellations" to="/constellations">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {conHits.map((c) => (
              <Link
                key={c.id}
                to={`/constellations/${c.id}`}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4
                           hover:border-[#7c6aff]/40 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-[#f0f0f8]">{c.name}</h3>
                  <span className="text-[11px] font-mono text-[#6b6b85]">{c.id}</span>
                </div>
                <p className="text-[11px] text-[#6b6b85] italic mt-0.5">{c.genitive}</p>
                <p className="text-[11px] text-[#a0a0b8] mt-2">{c.starCount} stars</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {show('stars') && starHits.length > 0 && (
        <Section icon={<StarIcon className="w-4 h-4 text-[#9b8cff]" />} title="Stars" to="/stars">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {starHits.map((s) => {
              const [r, g, b] = bvToRGB(s.ci)
              const css = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
              return (
                <Link
                  key={s.slug}
                  to={`/stars/${s.slug}`}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4
                             hover:border-[#7c6aff]/40 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: css, boxShadow: `0 0 8px ${css}` }}
                    />
                    <h3 className="text-[14px] font-semibold text-[#f0f0f8] truncate">
                      {s.name ?? `HIP ${s.hip}`}
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono text-[#9b8cff]">
                    {greekLetter(s.b) ? `${greekLetter(s.b)} ` : ''}
                    {s.conName ?? ''}
                  </p>
                  <p className="text-[11px] font-mono text-[#6b6b85] mt-1.5">
                    mag {s.mag} · {s.ly ? `${Math.round(s.ly)} ly` : '—'}
                  </p>
                </Link>
              )
            })}
          </div>
        </Section>
      )}

      {q && conHits.length === 0 && starHits.length === 0 && dsHits.length === 0 && (
        <p className="text-[#6b6b85] text-center py-16">Nothing matches “{query}”.</p>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  to,
  children,
}: {
  icon: React.ReactNode
  title: string
  to: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="inline-flex items-center gap-2 text-[1.15rem] font-semibold text-[#f0f0f8]">
          {icon}
          {title}
        </h2>
        <Link to={to} className="text-[13px] text-[#9b8cff] hover:text-[#c084fc] transition-colors">
          See all →
        </Link>
      </div>
      {children}
    </section>
  )
}
