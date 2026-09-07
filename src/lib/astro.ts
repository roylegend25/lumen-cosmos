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

export interface Nebula {
  slug: string
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

export function greekLetter(bayer: string | null): string | null {
  if (!bayer) return null
  return GREEK[bayer] ?? bayer
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

export const assetUrl = (p: string) => `${BASE}${p}`
