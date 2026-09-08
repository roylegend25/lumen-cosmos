import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Loader2 } from 'lucide-react'
import { StarMap3D } from '../components/StarMap3D'
import { bvToRGB, greekLetter, loadStars, type BrightStar } from '../lib/astro'

type Sort = 'brightness' | 'distance' | 'name'
const RADII = [25, 50, 100, 250]

export function Stars() {
  const nav = useNavigate()
  const [all, setAll] = useState<BrightStar[] | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('brightness')
  const [radius, setRadius] = useState(100)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    loadStars().then(setAll).catch(() => setAll([]))
  }, [])

  const list = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    let out = all
    if (q) {
      out = all.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.conName && s.conName.toLowerCase().includes(q)) ||
          (s.sp && s.sp.toLowerCase().includes(q)),
      )
    }
    const sorted = [...out]
    if (sort === 'brightness') sorted.sort((a, b) => a.mag - b.mag)
    if (sort === 'distance') sorted.sort((a, b) => (a.ly ?? 1e9) - (b.ly ?? 1e9))
    if (sort === 'name') {
      sorted.sort((a, b) => (a.name ?? 'zz').localeCompare(b.name ?? 'zz'))
    }
    return sorted
  }, [all, query, sort])

  if (!all) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading star catalogue…</span>
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
        Stars
      </h1>
      <p className="text-[#a0a0b8] max-w-2xl text-[15px] leading-relaxed mb-8">
        {all.length} named and naked-eye stars with real parallax distances, spectral types and
        colours. The map below is a true volume — every star sits at its actual distance from the
        Sun, so you are looking at the solar neighbourhood, not a projection of it.
      </p>

      <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#06060e] to-[#04040a] mb-3">
        <StarMap3D
          stars={all}
          radiusLy={radius}
          selectedSlug={selected}
          onSelect={(slug) => {
            setSelected(slug)
            nav(`/stars/${slug}`)
          }}
          className="h-[54vh] min-h-[380px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-10">
        <span className="text-[12px] text-[#6b6b85] mr-1">Radius</span>
        {RADII.map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-mono transition-colors border ${
              radius === r
                ? 'bg-[#7c6aff] text-white border-transparent'
                : 'text-[#a0a0b8] border-white/10 hover:bg-white/[0.05]'
            }`}
          >
            {r} ly
          </button>
        ))}
        <span className="text-[11px] text-[#6b6b85] ml-2">
          Drag to orbit · scroll to zoom · click a star to open it
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, constellation, or spectral type…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                       text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                       focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
          />
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['brightness', 'distance', 'name'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1.5 text-[12px] capitalize transition-colors ${
                sort === s ? 'bg-[#7c6aff] text-white' : 'text-[#a0a0b8] hover:text-[#f0f0f8]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-[#6b6b85] mb-4">{list.length} shown</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {list.slice(0, 240).map((s) => {
          const [r, g, b] = bvToRGB(s.ci)
          const css = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
          return (
            <Link
              key={s.slug}
              to={`/stars/${s.slug}`}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-4
                         hover:border-[#7c6aff]/40 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: css, boxShadow: `0 0 10px ${css}` }}
                />
                <h2 className="text-[15px] font-semibold text-[#f0f0f8] truncate">
                  {s.name ?? `HIP ${s.hip}`}
                </h2>
              </div>
              <p className="text-[11px] font-mono text-[#9b8cff] mb-2.5">
                {greekLetter(s.b) ? `${greekLetter(s.b)} ` : ''}
                {s.conName ?? ''}
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#6b6b85]">
                <span>mag {s.mag}</span>
                <span>{s.ly ? `${Math.round(s.ly).toLocaleString()} ly` : '—'}</span>
              </div>
              <p className="text-[11px] font-mono text-[#a0a0b8] mt-1">{s.sp ?? ''}</p>
            </Link>
          )
        })}
      </div>

      {list.length > 240 && (
        <p className="text-[12px] text-[#6b6b85] mt-6">
          Showing the first 240 of {list.length}. Narrow the search to see more.
        </p>
      )}

      <p className="text-[11px] text-[#6b6b85] mt-8">
        HYG database (Hipparcos / Yale Bright Star Catalog / Gliese). Colours derive from each
        star's catalogued B–V index, not from styling.
      </p>
    </div>
  )
}
