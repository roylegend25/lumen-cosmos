import type { Site } from './astro'

/**
 * Observing conditions from Open-Meteo — free, keyless and CORS-enabled,
 * so the browser can call it directly from a static host.
 */
export interface Conditions {
  /** Mean cloud cover across tonight's dark hours, 0-100. */
  cloudTonight: number | null
  /** Worst and best hour tonight, for "there is a window at 2am". */
  clearestHour: { time: string; cloud: number } | null
  sunset: string | null
  sunrise: string | null
  temperatureC: number | null
  humidity: number | null
  timezone: string | null
  fetchedAt: number
}

const cache = new Map<string, Promise<Conditions>>()

export function loadConditions(site: Site): Promise<Conditions> {
  const key = `${site.lat.toFixed(2)},${site.lon.toFixed(2)}`
  const hit = cache.get(key)
  if (hit) return hit

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${site.lat}&longitude=${site.lon}` +
    '&hourly=cloud_cover,temperature_2m,relative_humidity_2m' +
    '&daily=sunrise,sunset' +
    '&forecast_days=2&timezone=auto'

  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`weather ${r.status}`)
      return r.json()
    })
    .then((j): Conditions => {
      const times: string[] = j.hourly?.time ?? []
      const clouds: number[] = j.hourly?.cloud_cover ?? []
      const temps: number[] = j.hourly?.temperature_2m ?? []
      const hums: number[] = j.hourly?.relative_humidity_2m ?? []

      const sunset: string | null = j.daily?.sunset?.[0] ?? null
      const sunrise: string | null = j.daily?.sunrise?.[1] ?? j.daily?.sunrise?.[0] ?? null

      // Restrict to the hours between tonight's sunset and tomorrow's sunrise;
      // daytime cloud says nothing about whether you can observe.
      let nightIdx: number[] = []
      if (sunset && sunrise) {
        const a = new Date(sunset).getTime()
        const b = new Date(sunrise).getTime()
        nightIdx = times
          .map((t, i) => ({ t: new Date(t).getTime(), i }))
          .filter(({ t }) => t >= a && t <= b)
          .map(({ i }) => i)
      }
      if (!nightIdx.length) nightIdx = times.map((_, i) => i)

      const nightClouds = nightIdx.map((i) => clouds[i]).filter((c) => typeof c === 'number')
      const cloudTonight = nightClouds.length
        ? Math.round(nightClouds.reduce((a, b) => a + b, 0) / nightClouds.length)
        : null

      let clearestHour: Conditions['clearestHour'] = null
      for (const i of nightIdx) {
        const c = clouds[i]
        if (typeof c !== 'number') continue
        if (!clearestHour || c < clearestHour.cloud) clearestHour = { time: times[i], cloud: c }
      }

      const nowIdx = Math.max(
        0,
        times.findIndex((t) => new Date(t).getTime() >= Date.now()) - 1,
      )

      return {
        cloudTonight,
        clearestHour,
        sunset,
        sunrise,
        temperatureC: temps[nowIdx] ?? null,
        humidity: hums[nowIdx] ?? null,
        timezone: j.timezone ?? null,
        fetchedAt: Date.now(),
      }
    })

  cache.set(key, p)
  // A failed lookup should not be cached forever.
  p.catch(() => cache.delete(key))
  return p
}

export function cloudVerdict(cloud: number | null): { label: string; tone: 'good' | 'ok' | 'bad' } {
  if (cloud === null) return { label: 'Unknown', tone: 'ok' }
  if (cloud <= 20) return { label: 'Clear — good observing', tone: 'good' }
  if (cloud <= 50) return { label: 'Partly cloudy — patchy views', tone: 'ok' }
  if (cloud <= 80) return { label: 'Mostly cloudy — poor', tone: 'bad' }
  return { label: 'Overcast — nothing visible', tone: 'bad' }
}
