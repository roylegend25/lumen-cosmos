import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Compass, ArrowRight, Loader2 } from 'lucide-react'
import { SkyViewer, useSkyData } from '../components/SkyViewer'
import { formatLy, greekLetter } from '../lib/astro'

export function Sky() {
  const { sky, constellations, error } = useSkyData()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!constellations) return []
    const q = query.trim().toLowerCase()
    if (!q) return constellations
    return constellations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.genitive.toLowerCase().includes(q) ||
        c.stars.some((s) => s.n && s.n.toLowerCase().includes(q)),
    )
  }, [constellations, query])

  const active = constellations?.find((c) => c.id === activeId) ?? null

  const select = (id: string | null) => {
    setActiveId(id)
    if (id) setFocusId(id)
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#f0f0f8] mb-2">Could not load the star catalogue.</p>
          <p className="text-sm text-[#a0a0b8]">{error}</p>
        </div>
      </div>
    )
  }

  if (!sky || !constellations) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading 8,920 stars…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-[#050508]" />

      <div className="relative">
        <div className="section-padding container-wide pt-24 pb-6">
          <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-3">
            Open Sky
          </p>
          <h1 className="text-[2rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#f0f0f8] mb-3">
            The whole naked-eye sky
          </h1>
          <p className="text-[#a0a0b8] max-w-2xl text-[15px] leading-relaxed">
            {sky.count.toLocaleString()} real stars to magnitude {sky.magLimit}, positioned from the
            HYG catalogue, coloured by their true B–V index. Drag to look around, scroll to zoom,
            tap a figure to identify it.
          </p>
        </div>

        <div className="section-padding container-wide">
          <div className="grid lg:grid-cols-[1fr_320px] gap-5">
            {/* Sky */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-black">
              <SkyViewer
                sky={sky}
                constellations={constellations}
                activeId={activeId}
                onSelect={select}
                focusId={focusId}
                className="h-[58vh] min-h-[380px] lg:h-[70vh]"
              />

              {active && (
                <div className="absolute left-4 bottom-4 right-4 sm:right-auto sm:max-w-sm rounded-xl border border-white/10 bg-[#0a0a12]/90 backdrop-blur-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[#f0f0f8] font-semibold text-[15px]">{active.name}</h3>
                      <p className="text-[12px] text-[#a0a0b8] font-mono mt-0.5">
                        {active.genitive} · {active.id}
                      </p>
                    </div>
                    <Link
                      to={`/constellations/${active.id}`}
                      className="shrink-0 inline-flex items-center gap-1.5 text-[12px] text-[#9b8cff] hover:text-[#c084fc] transition-colors"
                    >
                      Explore <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[12px]">
                    <Row label="Stars (mag ≤ 6.5)" value={String(active.starCount)} />
                    <Row label="Brightest" value={active.stars[0]?.n ?? active.stars[0]?.b ?? '—'} />
                    <Row label="Nearest" value={formatLy(active.nearestLy)} />
                    <Row label="Farthest" value={formatLy(active.farthestLy)} />
                  </div>
                </div>
              )}
            </div>

            {/* Navigator */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a12]/60 p-4 flex flex-col">
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 88 constellations or a star…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                             text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                             focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
                />
              </div>

              <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-2 px-1">
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </p>

              <div className="overflow-y-auto max-h-[46vh] lg:max-h-[54vh] -mx-1 px-1">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => select(c.id)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors ${
                      c.id === activeId
                        ? 'bg-[#7c6aff]/20 border border-[#7c6aff]/40'
                        : 'hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-[#f0f0f8]">{c.name}</span>
                      <span className="text-[11px] text-[#6b6b85] font-mono">{c.starCount}</span>
                    </div>
                    <span className="text-[11px] text-[#a0a0b8]">
                      {c.stars[0]?.n
                        ? `${greekLetter(c.stars[0].b) ?? ''} ${c.stars[0].n}`.trim()
                        : c.genitive}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-[13px] text-[#6b6b85] px-3 py-6 text-center">No match.</p>
                )}
              </div>

              <Link
                to="/constellations"
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10
                           px-3 py-2.5 text-[13px] text-[#f0f0f8] hover:bg-white/[0.05] transition-colors"
              >
                <Compass className="w-4 h-4 text-[#9b8cff]" />
                Browse all 88
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-[#6b6b85] mt-4 mb-16">
            Star positions and magnitudes: HYG database (Hipparcos, Yale Bright Star Catalog,
            Gliese). Constellation figures: IAU boundaries via d3-celestial.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[#6b6b85]">{label}</span>
      <span className="text-[#dcdcec] text-right font-mono text-[11px]">{value}</span>
    </>
  )
}
