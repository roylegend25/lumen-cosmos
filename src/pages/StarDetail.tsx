import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  assetUrl,
  bvToRGB,
  bvToTemp,
  greekLetter,
  loadCharts,
  loadNebulae,
  loadStars,
  spectralInfo,
  type BrightStar,
  type Chart,
  type Nebula,
} from '../lib/astro'

export function StarDetail() {
  const { id } = useParams<{ id: string }>()
  const [all, setAll] = useState<BrightStar[] | null>(null)
  const [charts, setCharts] = useState<Record<string, Chart>>({})
  const [deepsky, setDeepsky] = useState<Nebula[]>([])

  useEffect(() => {
    loadStars().then(setAll).catch(() => setAll([]))
    loadCharts().then(setCharts).catch(() => setCharts({}))
    loadNebulae().then(setDeepsky).catch(() => setDeepsky([]))
  }, [])

  const s = useMemo(() => {
    if (!all || !id) return null
    const key = id.toLowerCase()
    return (
      all.find((x) => x.slug === key) ??
      all.find((x) => x.name && x.name.toLowerCase() === key) ??
      null
    )
  }, [all, id])

  const neighbours = useMemo(() => {
    if (!all || !s || !s.con) return []
    return all.filter((x) => x.con === s.con && x.slug !== s.slug).slice(0, 8)
  }, [all, s])

  if (!all) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#a0a0b8]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (!s) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[#f0f0f8]">No star matches “{id}”.</p>
        <Link to="/stars" className="text-[#9b8cff] hover:text-[#c084fc] text-sm">
          All stars →
        </Link>
      </div>
    )
  }

  const [r, g, b] = bvToRGB(s.ci)
  const css = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
  const temp = Math.round(bvToTemp(s.ci) / 10) * 10
  const info = spectralInfo(s.sp)
  const chart = s.con ? charts[s.con] ?? null : null
  const sibling = s.con ? deepsky.find((n) => n.conId === s.con) ?? null : null

  return (
    <div className="section-padding container-wide pt-24 pb-20">
      <Link
        to="/stars"
        className="inline-flex items-center gap-2 text-[13px] text-[#a0a0b8] hover:text-[#f0f0f8] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All stars
      </Link>

      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-full shrink-0 mt-1"
          style={{ background: css, boxShadow: `0 0 60px ${css}, 0 0 120px ${css}55` }}
        />
        <div>
          {s.conName && (
            <p className="text-[11px] font-medium tracking-[0.28em] text-[#9b8cff]/90 mb-2">
              {greekLetter(s.b) && (
                <span className="normal-case text-[13px]">{greekLetter(s.b)} · </span>
              )}
              <span className="uppercase">{s.conName}</span>
            </p>
          )}
          <h1 className="text-[2.2rem] md:text-[3rem] font-semibold tracking-[-0.02em] text-[#f0f0f8]">
            {s.name ?? `HIP ${s.hip}`}
          </h1>
          {info && (
            <p className="text-[14px] text-[#a0a0b8] mt-2">
              {info.label} star · {info.tempK}
            </p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Apparent magnitude" value={String(s.mag)} note="as seen from Earth" />
        <Stat
          label="Absolute magnitude"
          value={s.absmag !== null ? s.absmag.toFixed(2) : '—'}
          note="at a standard 32.6 ly"
        />
        <Stat
          label="Distance"
          value={s.ly ? `${Math.round(s.ly).toLocaleString()} ly` : '—'}
          note="parallax derived"
        />
        <Stat
          label="Luminosity"
          value={s.lum !== null ? `${formatLum(s.lum)} ☉` : '—'}
          note="relative to the Sun"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Spectral type" value={s.sp ?? '—'} note="MK classification" />
        <Stat label="Colour index (B–V)" value={s.ci.toFixed(3)} note="blue minus visual" />
        <Stat label="Effective temperature" value={`~${temp.toLocaleString()} K`} note="from B–V" />
        <Stat
          label="Position"
          value={`${(s.ra / 15).toFixed(2)}h ${s.dec >= 0 ? '+' : ''}${s.dec.toFixed(2)}°`}
          note="RA / Dec (J2000)"
        />
      </div>

      {chart && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 mb-10">
          <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-white flex items-center justify-center max-h-[70vh]">
            <img
              src={assetUrl(chart.file)}
              alt={`IAU chart for ${s.conName}, showing the position of ${s.name ?? 'this star'}`}
              loading="lazy"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div>
              <h2 className="text-[1.1rem] font-semibold text-[#f0f0f8] mb-2">Where to find it</h2>
              <p className="text-[13px] text-[#a0a0b8] leading-relaxed mb-2">
                {s.name ?? 'This star'} sits in {s.conName}. Stars are unresolved points even to
                large telescopes, so this is the official IAU chart of its constellation rather
                than a photograph of the star itself.
              </p>
              <p className="text-[11px] text-[#6b6b85]">
                {chart.credit} · {chart.license}
              </p>
            </div>

            {sibling && (
              <Link
                to={`/nebulae/${sibling.slug}`}
                className="group rounded-xl overflow-hidden border border-white/[0.07] hover:border-[#7c6aff]/40 transition-colors"
              >
                <div className="aspect-[16/9] overflow-hidden bg-black">
                  <img
                    src={assetUrl(sibling.image)}
                    alt={sibling.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[12px] text-[#f0f0f8] font-medium">{sibling.name}</p>
                  <p className="text-[11px] text-[#a0a0b8]">
                    Also in {s.conName} · {sibling.catalog}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {s.ly !== null && (
        <p className="text-[14px] text-[#a0a0b8] leading-relaxed max-w-3xl mb-10">
          Light leaving {s.name ?? 'this star'} takes about{' '}
          <span className="text-[#f0f0f8]">{Math.round(s.ly).toLocaleString()} years</span> to reach
          us, so you are seeing it as it was around{' '}
          <span className="text-[#f0f0f8]">
            {new Date().getFullYear() - Math.round(s.ly) > 0
              ? `${new Date().getFullYear() - Math.round(s.ly)} CE`
              : `${Math.abs(new Date().getFullYear() - Math.round(s.ly)).toLocaleString()} BCE`}
          </span>
          .
        </p>
      )}

      {neighbours.length > 0 && s.conName && (
        <>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-[1.25rem] font-semibold text-[#f0f0f8]">
              Also in {s.conName}
            </h2>
            {s.con && (
              <Link
                to={`/constellations/${s.con}`}
                className="text-[13px] text-[#9b8cff] hover:text-[#c084fc] transition-colors"
              >
                See the figure →
              </Link>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {neighbours.map((n) => {
              const [nr, ng, nb] = bvToRGB(n.ci)
              const ncss = `rgb(${Math.round(nr * 255)},${Math.round(ng * 255)},${Math.round(nb * 255)})`
              return (
                <Link
                  key={n.slug}
                  to={`/stars/${n.slug}`}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4
                             hover:border-[#7c6aff]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: ncss, boxShadow: `0 0 8px ${ncss}` }}
                    />
                    <span className="text-[14px] text-[#f0f0f8] truncate">
                      {n.name ?? `HIP ${n.hip}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6b6b85]">mag {n.mag}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <p className="text-[11px] text-[#6b6b85] mt-10">
        HYG database (Hipparcos / Yale Bright Star Catalog / Gliese). Parallax distances carry real
        uncertainty that grows with distance.
      </p>
    </div>
  )
}

function formatLum(l: number): string {
  if (l >= 1000) return Math.round(l).toLocaleString()
  if (l >= 10) return l.toFixed(0)
  if (l >= 1) return l.toFixed(2)
  return l.toFixed(4)
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-1.5">{label}</p>
      <p className="text-[#f0f0f8] text-[17px] font-medium">{value}</p>
      {note && <p className="text-[11px] text-[#6b6b85] mt-1">{note}</p>}
    </div>
  )
}
