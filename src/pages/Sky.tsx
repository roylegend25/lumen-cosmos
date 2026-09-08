import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, ArrowRight, Loader2, MapPin, Clock, Compass, Cloud, Moon, Sun, Play, Pause,
} from 'lucide-react'
import { SkyViewer, useSkyData } from '../components/SkyViewer'
import { LocationGate, loadSavedSite, saveSite } from '../components/LocationGate'
import {
  azimuthToCompass,
  bestViewingDate,
  darkness,
  formatLy,
  greekLetter,
  julianDate,
  lstDeg,
  moonIllumination,
  pointingInstruction,
  raDecToAltAz,
  type Site,
} from '../lib/astro'
import { cloudVerdict, loadConditions, type Conditions } from '../lib/weather'

export function Sky() {
  const { sky, constellations, error } = useSkyData()
  const [site, setSite] = useState<Site | null>(() => loadSavedSite())
  const [now, setNow] = useState(() => new Date())
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [tour, setTour] = useState(true)
  const [weather, setWeather] = useState<Conditions | null>(null)
  const [weatherErr, setWeatherErr] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!site) return
    setWeather(null)
    setWeatherErr(false)
    loadConditions(site).then(setWeather).catch(() => setWeatherErr(true))
  }, [site])

  const lst = useMemo(() => (site ? lstDeg(julianDate(now), site.lon) : 0), [site, now])
  const dark = useMemo(() => (site ? darkness(now, site) : null), [now, site])
  const moon = useMemo(() => moonIllumination(now), [now])

  /** Current altitude and azimuth of every constellation, from its brightest star. */
  const positions = useMemo(() => {
    if (!constellations || !site) return []
    return constellations.map((c) => {
      const top = c.stars[0]
      const p = top
        ? raDecToAltAz(top.ra, top.dec, site.lat, lst)
        : { alt: -90, az: 0 }
      return { c, alt: p.alt, az: p.az }
    })
  }, [constellations, site, lst])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = positions
    if (q) {
      out = positions.filter(
        ({ c }) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.genitive.toLowerCase().includes(q) ||
          c.stars.some((s) => s.n && s.n.toLowerCase().includes(q)),
      )
    }
    return [...out].sort((a, b) => b.alt - a.alt)
  }, [positions, query])

  const visible = positions.filter((p) => p.alt > 0)
  const tourOrder = useMemo(
    () => visible.slice(0, 14).map((p) => p.c.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible.map((v) => v.c.id).join(',')],
  )

  const active = positions.find((p) => p.c.id === activeId) ?? null

  const select = (id: string | null) => {
    setTour(false)
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

  const verdict = cloudVerdict(weather?.cloudTonight ?? null)

  return (
    <div className="section-padding container-wide pt-24 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#9b8cff]/90 mb-2">
            Open Sky
          </p>
          <h1 className="text-[2rem] md:text-[2.6rem] font-semibold tracking-[-0.02em] text-[#f0f0f8]">
            The sky above you
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <Chip icon={<MapPin className="w-3.5 h-3.5 text-[#9b8cff]" />}>
            {site.label}
            <span className="font-mono text-[#6b6b85] ml-1.5">
              {Math.abs(site.lat).toFixed(1)}°{site.lat >= 0 ? 'N' : 'S'}
            </span>
          </Chip>
          <Chip icon={<Clock className="w-3.5 h-3.5 text-[#9b8cff]" />}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Chip>
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

      {/* Conditions strip — is it even worth going outside right now. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Condition
          icon={dark?.level === 'day' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          label="Sky right now"
          value={
            dark === null
              ? '—'
              : dark.level === 'day'
                ? 'Daylight'
                : dark.level === 'civil'
                  ? 'Civil twilight'
                  : dark.level === 'nautical'
                    ? 'Nautical twilight'
                    : 'Fully dark'
          }
          note={dark ? `Sun ${dark.sunAlt > 0 ? '+' : ''}${dark.sunAlt.toFixed(0)}°` : undefined}
          tone={dark?.level === 'astronomical' ? 'good' : dark?.level === 'day' ? 'bad' : 'ok'}
        />
        <Condition
          icon={<Cloud className="w-4 h-4" />}
          label="Cloud tonight"
          value={
            weatherErr
              ? 'Unavailable'
              : weather
                ? `${weather.cloudTonight ?? '—'}%`
                : 'Checking…'
          }
          note={weather ? verdict.label : undefined}
          tone={weather ? verdict.tone : 'ok'}
        />
        <Condition
          icon={<Moon className="w-4 h-4" />}
          label="Moon"
          value={`${Math.round(moon.illum * 100)}% lit`}
          note={moon.name}
          tone={moon.illum < 0.35 ? 'good' : moon.illum < 0.7 ? 'ok' : 'bad'}
        />
        <Condition
          icon={<Compass className="w-4 h-4" />}
          label="Above horizon"
          value={`${visible.length} of 88`}
          note={weather?.sunset ? `Sunset ${weather.sunset.slice(11, 16)}` : undefined}
          tone="ok"
        />
      </div>

      {dark?.level === 'day' && (
        <p className="text-[12px] text-[#ffd8a8] bg-[#ffb45711] border border-[#ffb45733] rounded-lg px-3 py-2 mb-5">
          The Sun is up at your location, so none of this is visible to the naked eye right now.
          Positions below are still correct — they show where each constellation actually sits
          behind the daylight.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#05060f] to-[#04040a]">
          <SkyViewer
            sky={sky}
            constellations={constellations}
            site={site}
            date={now}
            activeId={activeId}
            onSelect={select}
            focusId={focusId}
            tour={tour}
            tourOrder={tourOrder}
            onTourStep={(id) => setActiveId(id)}
            onUserInteract={() => setTour(false)}
            className="h-[60vh] min-h-[400px] lg:h-[74vh]"
          />

          <button
            onClick={() => setTour((t) => !t)}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/12
                       bg-[#0a0a12]/85 backdrop-blur-md px-3 py-1.5 text-[12px] text-[#dcdcec]
                       hover:bg-[#0a0a12] transition-colors"
          >
            {tour ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {tour ? 'Pause tour' : 'Take the tour'}
          </button>

          {active && (
            <div className="absolute left-4 bottom-4 right-4 sm:right-auto sm:max-w-md rounded-xl border border-white/10 bg-[#0a0a12]/93 backdrop-blur-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <h3 className="text-[#f0f0f8] font-semibold text-[15px]">{active.c.name}</h3>
                  <p className="text-[12px] text-[#a0a0b8] font-mono mt-0.5">
                    {active.c.genitive} · {active.c.id}
                  </p>
                </div>
                <Link
                  to={`/constellations/${active.c.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-[12px] text-[#9b8cff] hover:text-[#c084fc] transition-colors"
                >
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* The thing a person outside actually needs. */}
              <div
                className={`rounded-lg px-3 py-2 mb-2.5 border ${
                  active.alt > 0
                    ? 'bg-[#7c6aff]/12 border-[#7c6aff]/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wider text-[#6b6b85] mb-1">
                  Where to look
                </p>
                <p className="text-[13px] text-[#f0f0f8] leading-snug">
                  {pointingInstruction(active.alt, active.az)}
                </p>
                {active.alt > 0 && (
                  <p className="text-[11px] font-mono text-[#a0a0b8] mt-1">
                    bearing {active.az.toFixed(0)}° ({azimuthToCompass(active.az).short}) ·
                    altitude {active.alt.toFixed(0)}°
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <Row
                  label="Best night"
                  value={bestViewingDate(active.c.stars[0]?.ra ?? 0).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                />
                <Row label="Stars" value={String(active.c.starCount)} />
                <Row label="Brightest" value={active.c.stars[0]?.n ?? '—'} />
                <Row label="Nearest" value={formatLy(active.c.nearestLy)} />
              </div>
              <p className="text-[10px] text-[#6b6b85] mt-2 leading-relaxed">
                “Best night” is when it stands highest at local midnight.
              </p>
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
            Highest first · with bearing
          </p>

          <div className="overflow-y-auto max-h-[52vh] lg:max-h-[58vh] -mx-1 px-1">
            {filtered.map(({ c, alt, az }) => {
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
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[11px] text-[#a0a0b8]">
                      {c.stars[0]?.n
                        ? `${greekLetter(c.stars[0].b) ?? ''} ${c.stars[0].n}`.trim()
                        : c.genitive}
                    </span>
                    {up && (
                      <span className="text-[10px] font-mono text-[#7783b0]">
                        {azimuthToCompass(az).short}
                      </span>
                    )}
                  </div>
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
        Positions from your latitude, longitude and current local sidereal time. Catalogue: HYG
        (Hipparcos / Yale BSC / Gliese); figures: IAU. Cloud, sunrise and sunset from Open-Meteo.
      </p>
    </div>
  )
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[#dcdcec]">
      {icon}
      {children}
    </span>
  )
}

function Condition({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note?: string
  tone: 'good' | 'ok' | 'bad'
}) {
  const toneClass =
    tone === 'good' ? 'text-[#8fe3a0]' : tone === 'bad' ? 'text-[#ff9d8f]' : 'text-[#dcdcec]'
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5 text-[#6b6b85]">
        <span className={toneClass}>{icon}</span>
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-[16px] font-medium ${toneClass}`}>{value}</p>
      {note && <p className="text-[11px] text-[#6b6b85] mt-0.5">{note}</p>}
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
