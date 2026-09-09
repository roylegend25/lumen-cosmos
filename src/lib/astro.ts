import * as THREE from 'three'

/** Compact sky record: [raDeg, decDeg, magnitude, B-V colour index] */
export type SkyStar = [number, number, number, number]

export interface SkyData {
  magLimit: number
  count: number
  stars: SkyStar[]
}

export interface ConstellationStar {
  n: string | null
  b: string | null
  f: string | null
  hip: number | null
  ra: number
  dec: number
  ly: number | null
  mag: number
  ci: number
  sp: string | null
  lum: number | null
}

export interface Constellation {
  id: string
  name: string
  genitive: string
  desig: string
  rank: number | null
  starCount: number
  segments: [number, number][][]
  nearestLy: number | null
  farthestLy: number | null
  stars: ConstellationStar[]
}

export interface BrightStar {
  id: number
  hip: number | null
  name: string | null
  b: string | null
  f: string | null
  con: string | null
  conName: string | null
  ra: number
  dec: number
  /** Distance in light-years; null when the parallax was unusable. */
  ly: number | null
  mag: number
  absmag: number | null
  sp: string | null
  ci: number
  lum: number | null
  slug: string
}

export interface Chart {
  file: string
  credit: string
  license: string
  licenseUrl: string | null
  source: string | null
}

export interface Nebula {
  slug: string
  /** nebula | galaxy | cluster — these are genuinely different objects. */
  category: 'nebula' | 'galaxy' | 'cluster'
  name: string
  catalog: string
  type: string
  constellation: string
  conId: string
  distanceLy: number
  apparentMag: number
  radiusLy: number
  ra: number
  dec: number
  image: string
  nasaTitle: string | null
  credit: string
  description: string
  source: string
  nasaId: string
}

/**
 * Ballesteros' formula: B-V colour index to effective temperature (K).
 * Valid across the main sequence, which is what a naked-eye catalogue is.
 */
export function bvToTemp(bv: number): number {
  const b = Math.max(-0.4, Math.min(2.0, bv))
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62))
}

/**
 * Blackbody temperature to linear RGB, after Tanner Helland's piecewise fit.
 * Values are normalised so the brightest channel is 1 — stars carry their
 * brightness through point size and alpha, not through colour magnitude.
 */
export function tempToRGB(kelvin: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100
  let r: number
  let g: number
  let b: number

  if (t <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(t) - 161.1195681661
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  }

  if (t >= 66) b = 255
  else if (t <= 19) b = 0
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307

  const clamp = (v: number) => Math.max(0, Math.min(255, v)) / 255
  const rgb: [number, number, number] = [clamp(r), clamp(g), clamp(b)]
  const peak = Math.max(rgb[0], rgb[1], rgb[2]) || 1
  return [rgb[0] / peak, rgb[1] / peak, rgb[2] / peak]
}

export function bvToRGB(bv: number): [number, number, number] {
  return tempToRGB(bvToTemp(bv))
}

/**
 * Equatorial coordinates to a cartesian point on a sphere of given radius.
 * Negating X puts us inside the sphere looking out, matching the naked-eye view.
 */
export function radecToVec3(raDeg: number, decDeg: number, radius: number): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg)
  const dec = THREE.MathUtils.degToRad(decDeg)
  const cosDec = Math.cos(dec)
  return new THREE.Vector3(
    -radius * cosDec * Math.cos(ra),
    radius * Math.sin(dec),
    radius * cosDec * Math.sin(ra),
  )
}

/* ------------------------------------------------------------------ *
 * Observer-relative sky
 *
 * Equatorial coordinates are fixed to the celestial sphere; what a person
 * actually sees depends on where and when they look. These convert RA/Dec
 * into the horizontal (altitude/azimuth) frame for a given site and instant,
 * which is what makes a Kolkata sky differ from a Las Vegas one.
 * ------------------------------------------------------------------ */

export interface Site {
  lat: number
  lon: number
  label: string
}

/** Julian Date from a JS Date (UTC based). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

/** Greenwich Mean Sidereal Time in degrees. */
export function gmstDeg(jd: number): number {
  const d = jd - 2451545.0
  const g = 280.46061837 + 360.98564736629 * d
  return ((g % 360) + 360) % 360
}

/** Local Sidereal Time in degrees for an east-positive longitude. */
export function lstDeg(jd: number, lonDeg: number): number {
  return ((gmstDeg(jd) + lonDeg) % 360 + 360) % 360
}

export interface AltAz {
  alt: number
  az: number
}

/**
 * Equatorial to horizontal. Azimuth is measured from due north, increasing
 * eastward, which is the convention every star chart uses.
 */
export function raDecToAltAz(raDeg: number, decDeg: number, latDeg: number, lst: number): AltAz {
  const D = Math.PI / 180
  const H = (((lst - raDeg) % 360) + 360) % 360 * D
  const dec = decDeg * D
  const lat = latDeg * D

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))

  const denom = Math.cos(alt) * Math.cos(lat)
  let az: number
  if (Math.abs(denom) < 1e-9) {
    az = 0
  } else {
    const cosA = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / denom
    az = Math.acos(Math.max(-1, Math.min(1, cosA)))
    if (Math.sin(H) > 0) az = Math.PI * 2 - az
  }

  return { alt: alt / D, az: az / D }
}

/**
 * Horizontal coordinates to a cartesian point. Local frame is +Y up,
 * −Z toward north and +X toward east, so the observer stands at the origin.
 */
export function altAzToVec3(altDeg: number, azDeg: number, radius: number): THREE.Vector3 {
  const D = Math.PI / 180
  const alt = altDeg * D
  const az = azDeg * D
  const ca = Math.cos(alt)
  return new THREE.Vector3(
    radius * ca * Math.sin(az),
    radius * Math.sin(alt),
    -radius * ca * Math.cos(az),
  )
}

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

const COMPASS_LONG: Record<string, string> = {
  N: 'north', NNE: 'north-northeast', NE: 'northeast', ENE: 'east-northeast',
  E: 'east', ESE: 'east-southeast', SE: 'southeast', SSE: 'south-southeast',
  S: 'south', SSW: 'south-southwest', SW: 'southwest', WSW: 'west-southwest',
  W: 'west', WNW: 'west-northwest', NW: 'northwest', NNW: 'north-northwest',
}

export function azimuthToCompass(az: number): { short: string; long: string } {
  const i = Math.round((((az % 360) + 360) % 360) / 22.5) % 16
  const short = COMPASS_16[i]
  return { short, long: COMPASS_LONG[short] }
}

/** Plain-language instruction for actually finding something in the sky. */
export function pointingInstruction(alt: number, az: number): string {
  const { long } = azimuthToCompass(az)
  if (alt < 0) return `Below the horizon — it is under your feet, ${Math.abs(alt).toFixed(0)}° down`
  if (alt > 80) return 'Almost directly overhead — look straight up'
  const height =
    alt < 20 ? 'low above the horizon' : alt < 50 ? 'about halfway up' : 'high up'
  return `Face ${long}, then look ${height} — ${alt.toFixed(0)}° above the horizon`
}

/**
 * Low-precision solar position (Astronomical Almanac). Good to ~0.01°, which
 * is far better than needed to answer "is it dark yet".
 */
export function sunRaDec(jd: number): { ra: number; dec: number } {
  const D = Math.PI / 180
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * D
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D
  const eps = (23.439 - 0.0000004 * n) * D
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / D
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / D
  return { ra: (ra + 360) % 360, dec }
}

export type Darkness = 'day' | 'civil' | 'nautical' | 'astronomical'

/** How dark the sky is right now, by the standard solar-altitude bands. */
export function darkness(date: Date, site: Site): { sunAlt: number; level: Darkness } {
  const jd = julianDate(date)
  const { ra, dec } = sunRaDec(jd)
  const { alt } = raDecToAltAz(ra, dec, site.lat, lstDeg(jd, site.lon))
  const level: Darkness =
    alt > -0.833 ? 'day' : alt > -6 ? 'civil' : alt > -12 ? 'nautical' : 'astronomical'
  return { sunAlt: alt, level }
}

/**
 * Moon illumination as a 0..1 fraction, from the mean synodic cycle.
 * A full Moon washes out everything fainter than about magnitude 4, so this
 * matters as much as cloud for whether a faint figure is actually visible.
 */
export function moonIllumination(date: Date): { phase: number; illum: number; name: string } {
  const jd = julianDate(date)
  const phase = (((jd - 2451550.1) / 29.530588853) % 1 + 1) % 1
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2
  const names = [
    'New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
  ]
  return { phase, illum, name: names[Math.round(phase * 8) % 8] }
}

/**
 * The date a constellation stands highest at local midnight — its best night
 * of the year. That happens when the Sun sits opposite it, i.e. when the
 * Sun's right ascension is twelve hours from the constellation's.
 */
export function bestViewingDate(raDeg: number, year = new Date().getFullYear()): Date {
  const raHours = raDeg / 15
  // Sun's RA is 0h at the March equinox and advances a full turn per year.
  const daysAfterEquinox = (((raHours - 12) % 24) + 24) % 24 * (365.25 / 24)
  const equinox = new Date(Date.UTC(year, 2, 20))
  return new Date(equinox.getTime() + daysAfterEquinox * 86400000)
}

/** A short list of real sites for when geolocation is unavailable or denied. */
export const CITIES: Site[] = [
  { label: 'Kolkata, India', lat: 22.5726, lon: 88.3639 },
  { label: 'Mumbai, India', lat: 19.076, lon: 72.8777 },
  { label: 'Delhi, India', lat: 28.6139, lon: 77.209 },
  { label: 'Bengaluru, India', lat: 12.9716, lon: 77.5946 },
  { label: 'Las Vegas, USA', lat: 36.1699, lon: -115.1398 },
  { label: 'New York, USA', lat: 40.7128, lon: -74.006 },
  { label: 'London, UK', lat: 51.5072, lon: -0.1276 },
  { label: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { label: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { label: 'Cape Town, South Africa', lat: -33.9249, lon: 18.4241 },
  { label: 'Reykjavík, Iceland', lat: 64.1466, lon: -21.9426 },
  { label: 'Santiago, Chile', lat: -33.4489, lon: -70.6693 },
  { label: 'Nairobi, Kenya', lat: -1.2921, lon: 36.8219 },
  { label: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357 },
  { label: 'São Paulo, Brazil', lat: -23.5558, lon: -46.6396 },
  { label: 'Dubai, UAE', lat: 25.2048, lon: 55.2708 },
]

export const COMPASS = [
  { label: 'N', az: 0 },
  { label: 'NE', az: 45 },
  { label: 'E', az: 90 },
  { label: 'SE', az: 135 },
  { label: 'S', az: 180 },
  { label: 'SW', az: 225 },
  { label: 'W', az: 270 },
  { label: 'NW', az: 315 },
]

/** Apparent magnitude to a 0..1 brightness weight (lower magnitude = brighter). */
export function magToBrightness(mag: number, limit = 6.5): number {
  return Math.max(0.04, Math.min(1, Math.pow(2.512, (limit - mag) / 5.5) - 0.35))
}

export function formatLy(ly: number | null): string {
  if (ly === null) return 'distance unknown'
  if (ly >= 1000) return `${Math.round(ly).toLocaleString()} light-years`
  return `${ly.toLocaleString()} light-years`
}

/**
 * HYG stores Bayer letters as three-letter abbreviations.
 *
 * Note these are NOT a brightness ranking: Rigel is β Orionis yet outshines
 * α Orionis (Betelgeuse), and the same holds for Pollux and Sadalsuud. Always
 * render the catalogued letter rather than inferring one from magnitude order.
 */
const GREEK: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ',
  Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ',
  Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
}

const SUPERSCRIPT: Record<string, string> = {
  '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075',
  '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
}

/**
 * HYG writes numbered Bayer designations as "Alp-2" (alpha-2 Canum
 * Venaticorum). Rendering that raw leaks the catalogue's encoding into the UI.
 */
export function greekLetter(bayer: string | null): string | null {
  if (!bayer) return null
  const m = bayer.match(/^([A-Za-z]+)(?:-(\d))?$/)
  if (!m) return bayer
  const base = GREEK[m[1]] ?? m[1]
  return m[2] ? `${base}${SUPERSCRIPT[m[2]] ?? m[2]}` : base
}

/** Bayer/Flamsteed designation rendered with the constellation genitive. */
export function designation(s: ConstellationStar, genitive: string): string | null {
  const g = greekLetter(s.b)
  if (g) return `${g} ${genitive}`
  if (s.f) return `${s.f} ${genitive}`
  return null
}

const BASE = import.meta.env.BASE_URL

const cache = new Map<string, Promise<unknown>>()

function loadJSON<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    cache.set(
      file,
      fetch(`${BASE}data/${file}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${file}: ${r.status}`)
        return r.json()
      }),
    )
  }
  return cache.get(file) as Promise<T>
}

export const loadSky = () => loadJSON<SkyData>('sky.json')
export const loadConstellations = () => loadJSON<Constellation[]>('constellations.json')
export const loadNebulae = () => loadJSON<Nebula[]>('nebulae.json')
export const loadStars = () => loadJSON<BrightStar[]>('stars.json')
export const loadCharts = () => loadJSON<Record<string, Chart>>('charts.json')

/** Leading spectral class letter, e.g. "M2Iab" -> "M". */
export function spectralClass(sp: string | null): string | null {
  if (!sp) return null
  const m = sp.trim().match(/^[OBAFGKMLTY]/i)
  return m ? m[0].toUpperCase() : null
}

const CLASS_INFO: Record<string, { label: string; tempK: string }> = {
  O: { label: 'Blue supergiant class', tempK: '30,000–50,000 K' },
  B: { label: 'Blue-white', tempK: '10,000–30,000 K' },
  A: { label: 'White', tempK: '7,500–10,000 K' },
  F: { label: 'Yellow-white', tempK: '6,000–7,500 K' },
  G: { label: 'Yellow (Sun-like)', tempK: '5,200–6,000 K' },
  K: { label: 'Orange', tempK: '3,700–5,200 K' },
  M: { label: 'Red', tempK: '2,400–3,700 K' },
}

export function spectralInfo(sp: string | null) {
  const c = spectralClass(sp)
  return c ? CLASS_INFO[c] ?? null : null
}

export const assetUrl = (p: string) => `${BASE}${p}`
