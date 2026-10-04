// Pure weather rules shared by the UI and the push server.
const SLOT_MS = 15 * 60_000
export const STORM_CAPE = 2500 // J/kg
export const STORM_LI = -5 // lifted index
export const WET_MM = 0.2 // mm per 15 min that counts as "raining"

/**
 * minutely: [{ time: epoch ms of slot start, precip: mm in that 15-min slot }]
 * Returns { kind: 'now'|'ending'|'soon'|'dry'|'unknown', minutes: number|null }
 */
export function nowcast(minutely, now) {
  const slots = (minutely ?? []).filter((s) => s.time + SLOT_MS > now)
  if (!slots.length) return { kind: 'unknown', minutes: null }
  const wet = (s) => s.precip >= WET_MM
  if (wet(slots[0])) {
    const dry = slots.find((s) => !wet(s))
    if (!dry) return { kind: 'now', minutes: null }
    return { kind: 'ending', minutes: Math.max(1, Math.round((dry.time - now) / 60_000)) }
  }
  const next = slots.find(wet)
  if (next) return { kind: 'soon', minutes: Math.max(1, Math.round((next.time - now) / 60_000)) }
  return { kind: 'dry', minutes: null }
}

const level = (v, steps) => steps.reduce((l, s, i) => (v >= s ? i + 1 : l), 0)

/**
 * input: { current, daily0, air, hourly, now }
 * Returns alerts sorted by level desc: { id, level: 1|2|3, value }
 */
export function alertsFor({ current, daily0, air, hourly, now }) {
  const out = []
  const aqi = air?.usAqi
  if (typeof aqi === 'number') {
    const l = level(aqi, [101, 151, 201])
    if (l) out.push({ id: 'aqi', level: l, value: Math.round(aqi) })
  }
  const feels = Math.max(current.feelsLike, daily0?.apparentMax ?? -Infinity)
  const hl = level(feels, [38, 41, 45])
  if (hl) out.push({ id: 'heat', level: hl, value: Math.round(feels) })

  const uv = Math.max(current.uv, daily0?.uvMax ?? 0)
  if (current.isDay) {
    const ul = level(uv, [8, 11])
    if (ul) out.push({ id: 'uv', level: ul, value: Math.round(uv) })
  }

  const next3 = (hourly ?? []).filter((h) => h.time + 3600_000 > now && h.time < now + 3 * 3600_000)
  const stormy = current.code >= 95 || next3.some((h) => h.code >= 95)
  // Unstable air: high CAPE with a strongly negative lifted index in the next 3 h.
  const unstable = next3.some((h) => (h.cape ?? 0) >= STORM_CAPE && (h.liftedIndex ?? 0) <= STORM_LI)
  if (stormy) out.push({ id: 'storm', level: 2, value: 0 })
  else if (unstable) out.push({ id: 'storm', level: 1, value: 0 })

  // Humid heat: wet-bulb temperature (now or within 6 h) says more than "feels like" in the tropics.
  const next6 = (hourly ?? []).filter((h) => h.time + 3600_000 > now && h.time < now + 6 * 3600_000)
  const wb = Math.max(current.wetBulb ?? -Infinity, ...next6.map((h) => h.wetBulb ?? -Infinity))
  const wl = level(wb, [26, 28, 30])
  if (wl) out.push({ id: 'humid', level: wl, value: Math.round(wb) })

  if (!stormy && (daily0?.precipProbMax ?? 0) >= 60) {
    out.push({ id: 'umbrella', level: 1, value: daily0.precipProbMax })
  }
  return out.sort((a, b) => b.level - a.level)
}

/**
 * rainProb: [{ time: epoch ms of hour start, p: 0..1 share of ensemble members that are wet }]
 * Highest chance over the next 3 hours -> { p, time } or null.
 */
export function rainChance(rainProb, now) {
  const slots = (rainProb ?? []).filter((r) => r.time + 3600_000 > now && r.time < now + 3 * 3600_000)
  if (!slots.length) return null
  return slots.reduce((a, b) => (b.p > a.p ? b : a))
}

/** WMO weather code -> coarse kind (mirrors the app's describeWeather). */
export function kindOfCode(code) {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

const rainBucket = (p) => (p >= 0.6 ? 2 : p >= 0.3 ? 1 : 0)

/** Snapshot used to decide whether an hourly update is worth sending. */
export function hourlyDigest({ temp, code, alerts, rainP }) {
  return { temp, kind: kindOfCode(code), rain: rainBucket(rainP ?? 0), alerts: alerts.map((a) => `${a.id}${a.level}`).sort().join(',') }
}

/** True when `cur` differs enough from the last sent digest (or there is none). */
export function hourlyChanged(prev, cur) {
  if (!prev) return true
  return Math.abs(cur.temp - prev.temp) >= 3 || cur.kind !== prev.kind || cur.rain !== prev.rain || cur.alerts !== prev.alerts
}

/**
 * Ensemble API response -> [{ time, p }] where p is the share of members with at
 * least `wetMm` of rain in that hour. `j.hourly` has one array per member.
 */
export function ensembleRainProb(j, wetMm = 0.2) {
  const h = j?.hourly
  if (!h?.time) return []
  const keys = Object.keys(h).filter((k) => k.startsWith('precipitation'))
  const off = j.utc_offset_seconds ?? 0
  return h.time.map((s, i) => {
    let n = 0
    let wet = 0
    for (const k of keys) {
      const v = h[k][i]
      if (v == null) continue
      n++
      if (v >= wetMm) wet++
    }
    return { time: Date.parse(s + 'Z') - off * 1000, p: n ? wet / n : 0 }
  })
}
