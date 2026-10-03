// Pure weather rules shared by the UI and the push server.
const SLOT_MS = 15 * 60_000
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

  const soon = (hourly ?? []).some((h) => h.time + 3600_000 > now && h.time < now + 3 * 3600_000 && h.code >= 95)
  const stormy = current.code >= 95 || soon
  if (stormy) out.push({ id: 'storm', level: 2, value: 0 })

  if (!stormy && (daily0?.precipProbMax ?? 0) >= 60) {
    out.push({ id: 'umbrella', level: 1, value: daily0.precipProbMax })
  }
  return out.sort((a, b) => b.level - a.level)
}
