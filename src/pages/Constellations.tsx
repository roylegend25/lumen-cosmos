import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader2, Telescope } from 'lucide-react'
import { greekLetter, loadConstellations, type Constellation } from '../lib/astro'

type Sort = 'name' | 'stars' | 'brightest'

export function Constellations() {
  const [all, setAll] = useState<Constellation[] | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('name')

  useEffect(() => {
    loadConstellations().then(setAll).catch(() => setAll([]))
  }, [])

  const list = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    let out = all
    if (q) {
      out = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.genitive.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.stars.some((s) => s.n && s.n.toLowerCase().includes(q)),
      )
    }
    const sorted = [...out]
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'stars') sorted.sort((a, b) => b.starCount - a.starCount)
    if (sort === 'brightest') {
      sorted.sort((a, b) => (a.stars[0]?.mag ?? 99) - (b.stars[0]?.mag ?? 99))
    }
    return sorted
  }, [all, query, sort])

  if (!all) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading catalogue…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="section-padding container-wide pt-24 pb-20">
      <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-3">
        Catalogue
      </p>
      <h1 className="text-[2rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#f0f0f8] mb-3">
        All 88 constellations
      </h1>
      <p className="text-[#a0a0b8] max-w-2xl text-[15px] leading-relaxed mb-8">
        The complete IAU set, each with its real star list, parallax distances and an interactive
        3D figure you can rotate.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, genitive, or star…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                       text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                       focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
          />
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['name', 'stars', 'brightest'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1.5 text-[12px] capitalize transition-colors ${
                sort === s ? 'bg-[#7c6aff] text-white' : 'text-[#a0a0b8] hover:text-[#f0f0f8]'
              }`}
            >
              {s === 'stars' ? 'Star count' : s}
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

      <p className="text-[12px] text-[#6b6b85] mb-4">{list.length} shown</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {list.map((c) => {
          const top = c.stars[0]
          return (
            <Link
              key={c.id}
              to={`/constellations/${c.id}`}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-4
                         hover:border-[#7c6aff]/40 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h2 className="text-[15px] font-semibold text-[#f0f0f8] group-hover:text-white transition-colors">
                  {c.name}
                </h2>
                <span className="text-[11px] font-mono text-[#6b6b85]">{c.id}</span>
              </div>
              <p className="text-[12px] text-[#6b6b85] italic mb-3">{c.genitive}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#a0a0b8]">
                  {top?.n ? (
                    <>
                      {greekLetter(top.b) ? `${greekLetter(top.b)} ` : ''}
                      {top.n}
                    </>
                  ) : (
                    `${c.starCount} stars`
                  )}
                </span>
                {top && <span className="font-mono text-[#6b6b85]">mag {top.mag}</span>}
              </div>
            </Link>
          )
        })}
      </div>

      {list.length === 0 && (
        <p className="text-[#6b6b85] text-center py-16">Nothing matches “{query}”.</p>
      )}
    </div>
  )
}
