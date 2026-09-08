import { useState } from 'react'
import { MapPin, Loader2, Navigation, Search } from 'lucide-react'
import { CITIES, type Site } from '../lib/astro'

const STORAGE_KEY = 'lumen.site'

export function loadSavedSite(): Site | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (typeof s?.lat === 'number' && typeof s?.lon === 'number' && typeof s?.label === 'string') {
      return s as Site
    }
  } catch {
    /* corrupt or unavailable storage — fall through to the gate */
  }
  return null
}

export function saveSite(site: Site) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(site))
  } catch {
    /* private mode; the choice simply will not persist */
  }
}

/**
 * The sky genuinely differs by observing site, so a location is required
 * before anything is drawn. Browser geolocation is offered first; a city
 * list covers refusal, insecure contexts and headless environments.
 */
export function LocationGate({ onPick }: { onPick: (s: Site) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const useDevice = () => {
    if (!('geolocation' in navigator)) {
      setErr('This browser does not expose geolocation. Pick a city below.')
      return
    }
    setBusy(true)
    setErr(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const s: Site = {
          lat: +pos.coords.latitude.toFixed(4),
          lon: +pos.coords.longitude.toFixed(4),
          label: 'Your location',
        }
        saveSite(s)
        setBusy(false)
        onPick(s)
      },
      (e) => {
        setBusy(false)
        setErr(
          e.code === e.PERMISSION_DENIED
            ? 'Location permission denied. Pick a city below instead.'
            : `Could not get a fix (${e.message}). Pick a city below.`,
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }

  const q = query.trim().toLowerCase()
  const cities = q ? CITIES.filter((c) => c.label.toLowerCase().includes(q)) : CITIES

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0a0a12]/80 backdrop-blur-xl p-6 sm:p-8">
        <div className="w-11 h-11 rounded-xl bg-[#7c6aff]/15 flex items-center justify-center mb-5">
          <MapPin className="w-5 h-5 text-[#9b8cff]" />
        </div>

        <h2 className="text-[1.4rem] font-semibold text-[#f0f0f8] mb-2 tracking-tight">
          Where are you looking from?
        </h2>
        <p className="text-[14px] text-[#a0a0b8] leading-relaxed mb-6">
          The sky is different everywhere. From Kolkata you face Orion at a different angle than
          from Las Vegas, and half the southern sky never rises in London at all. Pick a spot and
          this becomes your sky, right now.
        </p>

        <button
          onClick={useDevice}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c6aff] hover:bg-[#9b8cff]
                     disabled:opacity-60 px-4 py-3 text-[14px] font-medium text-white transition-colors mb-4"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {busy ? 'Getting your position…' : 'Use my location'}
        </button>

        {err && (
          <p className="text-[12px] text-[#ffb4a8] bg-[#ff6b5722] border border-[#ff6b5744] rounded-lg px-3 py-2 mb-4">
            {err}
          </p>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-[#6b6b85]">or pick a city</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-[#6b6b85] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5
                       text-[13px] text-[#f0f0f8] placeholder:text-[#6b6b85]
                       focus:outline-none focus:border-[#7c6aff]/50 transition-colors"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-1.5 max-h-[40vh] overflow-y-auto">
          {cities.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                saveSite(c)
                onPick(c)
              }}
              className="text-left rounded-lg px-3 py-2.5 hover:bg-white/[0.06] border border-transparent
                         hover:border-white/10 transition-colors"
            >
              <div className="text-[13px] text-[#f0f0f8]">{c.label.split(',')[0]}</div>
              <div className="text-[11px] text-[#6b6b85] font-mono">
                {Math.abs(c.lat).toFixed(1)}°{c.lat >= 0 ? 'N' : 'S'}{' '}
                {Math.abs(c.lon).toFixed(1)}°{c.lon >= 0 ? 'E' : 'W'}
              </div>
            </button>
          ))}
          {cities.length === 0 && (
            <p className="text-[13px] text-[#6b6b85] col-span-2 text-center py-6">
              No city matches “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
