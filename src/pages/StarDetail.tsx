import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  bvToRGB,
  bvToTemp,
  greekLetter,
  loadStars,
  spectralInfo,
  type BrightStar,
} from '../lib/astro'

export function StarDetail() {
  const { id } = useParams<{ id: string }>()
  const [all, setAll] = useState<BrightStar[] | null>(null)

  useEffect(() => {
    loadStars().then(setAll).catch(() => setAll([]))
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
            <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-2">
              {greekLetter(s.b) ? `${greekLetter(s.b)} · ` : ''}
              {s.conName}
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
