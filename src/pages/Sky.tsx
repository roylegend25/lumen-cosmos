import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, Loader2, MapPin, Clock } from 'lucide-react'
import { SkyViewer, useSkyData } from '../components/SkyViewer'
import { LocationGate, loadSavedSite, saveSite } from '../components/LocationGate'
import {
  formatLy,
  greekLetter,
  julianDate,
  lstDeg,
  raDecToAltAz,
  type Site,
} from '../lib/astro'

export function Sky() {
  const { sky, constellations, error } = useSkyData()
  const [site, setSite] = useState<Site | null>(() => loadSavedSite())
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  // Advance the sky as real time passes; stars drift about 15°/hour.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const lst = useMemo(
    () => (site ? lstDeg(julianDate(now), site.lon) : 0),
    [site, now],
  )

  const withAltAz = useMemo(() => {
    if (!constellations || !site) return []
    return constellations.map((c) => {
      let alt = -90
      const top = c.stars[0]
      if (top) alt = raDecToAltAz(top.ra, top.dec, site.lat, lst).alt
      return { c, alt }
    })
  }, [constellations, site, lst])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = withAltAz
    if (q) {
      out = withAltAz.filter(
        ({ c }) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.genitive.toLowerCase().includes(q) ||
          c.stars.some((s) => s.n && s.n.toLowerCase().includes(q)),
      )
    }
    // Highest in the sky first — that is what is worth looking at now.
    return [...out].sort((a, b) => b.alt - a.alt)
  }, [withAltAz, query])

  const visibleCount = withAltAz.filter((x) => x.alt > 0).length
  const active = constellations?.find((c) => c.id === activeId) ?? null
  const activeAlt = withAltAz.find((x) => x.c.id === activeId)?.alt ?? null

  const select = (id: string | null) => {
    setActiveId(id)
    if (id) setFocusId(id)
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[#f0f0f8] mb-2">Could not load the star catalogue.</p>
          <p className="text-sm text-[#a0a0b8]">{error}</p>
        </div>
      </div>
    )
  }

  if (!site) return <LocationGate onPick={setSite} />

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
    <div className="section-padding container-wide pt-24 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-2">
            Open Sky
          </p>
          <h1 className="text-[2rem] md:text-[2.6rem] font-semibold tracking-[-0.02em] text-[#f0f0f8]">
            Your sky, right now
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[#dcdcec]">
            <MapPin className="w-3.5 h-3.5 text-[#9b8cff]" />
            {site.label}
            <span className="font-mono text-[#6b6b85]">
              {Math.abs(site.lat).toFixed(1)}°{site.lat >= 0 ? 'N' : 'S'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[#dcdcec]">
            <Clock className="w-3.5 h-3.5 text-[#9b8cff]" />
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={() => {
              saveSite({ lat: 0, lon: 0, label: '' })
              setSite(null)
            }}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[#a0a0b8] hover:text-[#f0f0f8] hover:bg-white/[0.05] transition-colors"
          >
            Change
          </button>
        </div>
      </div>

      <p className="text-[#a0a0b8] max-w-2xl text-[14px] leading-relaxed mb-6">
        {visibleCount} of 88 constellations are above your horizon. Drag to look around, scroll to
        zoom, tap a figure to identify it. North is ahead of you when you start.
      </p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#05060f] to-[#04040a]">
          <SkyViewer
            sky={sky}
            constellations={constellations}
            site={site}
            date={now}
            activeId={activeId}
            onSelect={select}
            focusId={focusId}
            className="h-[60vh] min-h-[400px] lg:h-[72vh]"
          />

          {active && (
            <div className="absolute left-4 bottom-4 right-4 sm:right-auto sm:max-w-sm rounded-xl border border-white/10 bg-[#0a0a12]/92 backdrop-blur-xl p-4">
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
                <Row label="Right now" value={
                  activeAlt === null ? '—'
                    : activeAlt > 0 ? `${activeAlt.toFixed(0)}° above horizon`
                    : `${Math.abs(activeAlt).toFixed(0)}° below`
                } />
                <Row label="Stars" value={String(active.starCount)} />
                <Row label="Brightest" value={active.stars[0]?.n ?? '—'} />
                <Row label="Nearest" value={formatLy(active.nearestLy)} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a12]/60 p-4 flex flex-col">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search constellations or stars…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                         text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                         focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
            />
          </div>

          <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-2 px-1">
            Sorted by altitude
          </p>

          <div className="overflow-y-auto max-h-[48vh] lg:max-h-[56vh] -mx-1 px-1">
            {filtered.map(({ c, alt }) => {
              const up = alt > 0
              return (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors border ${
                    c.id === activeId
                      ? 'bg-[#7c6aff]/20 border-[#7c6aff]/40'
                      : 'border-transparent hover:bg-white/[0.05]'
                  } ${up ? '' : 'opacity-45'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-[#f0f0f8]">{c.name}</span>
                    <span className={`text-[11px] font-mono ${up ? 'text-[#8fe3a0]' : 'text-[#6b6b85]'}`}>
                      {alt > 0 ? `+${alt.toFixed(0)}°` : `${alt.toFixed(0)}°`}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#a0a0b8]">
                    {c.stars[0]?.n
                      ? `${greekLetter(c.stars[0].b) ?? ''} ${c.stars[0].n}`.trim()
                      : c.genitive}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-[13px] text-[#6b6b85] px-3 py-6 text-center">No match.</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#6b6b85] mt-4">
        Positions computed from your latitude, longitude and the current local sidereal time.
        Catalogue: HYG (Hipparcos / Yale BSC / Gliese); figures: IAU.
      </p>
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
