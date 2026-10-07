// Web Push: subscription store, API handlers and the alert scheduler.
import webpush from 'web-push'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isLang } from '../shared/i18n.js'
import { alertsFor, ensembleRainProb, hourlyChanged, hourlyDigest, nowcast, rainChance } from '../shared/rules.js'
import { alertText, hourlyText, morningText, nowcastText, testText } from '../shared/messages.js'

const MIN = 60_000
const HOUR = 60 * MIN
// Push services want a contact (mailto: or https URL); set VAPID_SUBJECT to yours.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'https://github.com/two-skies/two-skies'

const getJson = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`)
  return r.json()
}

/** Minimal weather snapshot for the rules; times are absolute ms. */
export async function fetchSnapshot(place, fetchJson = getJson) {
  const f = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=temperature_2m,apparent_temperature,is_day,weather_code,uv_index,wet_bulb_temperature_2m` +
      `&hourly=weather_code,cape,lifted_index,wet_bulb_temperature_2m&forecast_hours=6` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,uv_index_max` +
      `&minutely_15=precipitation&forecast_minutely_15=8&timezone=auto&forecast_days=1`,
  )
  const air = await fetchJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}&current=us_aqi&timezone=auto`,
  ).catch(() => null)
  const ens = await fetchJson(
    `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${place.lat}&longitude=${place.lon}` +
      `&hourly=precipitation&models=ecmwf_ifs025&forecast_hours=6&timezone=auto`,
  ).catch(() => null)
  const off = f.utc_offset_seconds
  const t = (s) => Date.parse(s + 'Z') - off * 1000
  return {
    current: {
      temp: f.current.temperature_2m,
      feelsLike: f.current.apparent_temperature,
      isDay: f.current.is_day === 1,
      code: f.current.weather_code,
      uv: f.current.uv_index,
      wetBulb: f.current.wet_bulb_temperature_2m,
    },
    daily0: {
      code: f.daily.weather_code[0],
      tMax: f.daily.temperature_2m_max[0],
      tMin: f.daily.temperature_2m_min[0],
      apparentMax: f.daily.apparent_temperature_max?.[0],
      precipProbMax: f.daily.precipitation_probability_max?.[0] ?? 0,
      uvMax: f.daily.uv_index_max?.[0] ?? 0,
    },
    hourly: (f.hourly?.time ?? []).map((s, i) => ({
      time: t(s),
      code: f.hourly.weather_code[i],
      cape: f.hourly.cape?.[i],
      liftedIndex: f.hourly.lifted_index?.[i],
      wetBulb: f.hourly.wet_bulb_temperature_2m?.[i],
    })),
    rainProb: ens ? ensembleRainProb(ens) : [],
    minutely: (f.minutely_15?.time ?? []).map((s, i) => ({ time: t(s), precip: f.minutely_15.precipitation[i] ?? 0 })),
    air: air?.current ? { usAqi: air.current.us_aqi ?? null } : null,
  }
}

/**
 * getPlaces(): the cities push alerts may watch ({ id, name, names?, lat, lon, tz, utcOffsetMin }).
 * It is a function so a changed config takes effect without a restart.
 */
export function createPush({ dataDir, getPlaces = () => [], fetchJson = getJson, now = () => Date.now(), sendFn } = {}) {
  const file = join(dataDir, 'push.json')
  const nameCache = new Map()

  /** City name in the subscriber's language: stored names, else the geocoder (cached), else the default name. */
  async function placeName(place, lang) {
    if (lang === 'en') return place.name
    if (place.names?.[lang]) return place.names[lang]
    const gid = place.id.match(/:g(\d+)$/)?.[1]
    if (!gid) return place.name
    const key = `${gid}:${lang}`
    if (nameCache.has(key)) return nameCache.get(key)
    try {
      const j = await fetchJson(`https://geocoding-api.open-meteo.com/v1/get?id=${gid}&language=${encodeURIComponent(lang)}`)
      const n = typeof j?.name === 'string' && j.name ? j.name : place.name
      nameCache.set(key, n)
      return n
    } catch {
      return place.name
    }
  }
  let state = { vapid: null, subs: {}, sent: {}, digests: {} }
  let saving = Promise.resolve()

  const save = () => {
    saving = saving.then(async () => {
      await mkdir(dataDir, { recursive: true })
      const tmp = `${file}.tmp`
      await writeFile(tmp, JSON.stringify(state), { mode: 0o600 })
      await rename(tmp, file)
      await chmod(file, 0o600)
    })
    return saving
  }

  async function init() {
    try {
      state = { ...state, ...JSON.parse(await readFile(file, 'utf8')) }
    } catch {
      /* first run */
    }
    if (!state.vapid) {
      state.vapid = webpush.generateVAPIDKeys()
      await save()
    }
    webpush.setVapidDetails(VAPID_SUBJECT, state.vapid.publicKey, state.vapid.privateKey)
  }

  const send =
    sendFn ??
    (async (sub, payload) => webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'normal' }))

  async function deliver(entry, payload) {
    try {
      await send(entry.sub, payload)
      return true
    } catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        delete state.subs[entry.sub.endpoint]
        await save()
      }
      return false
    }
  }

  function validEntry(b) {
    const s = b?.subscription
    if (!s || typeof s.endpoint !== 'string' || !s.endpoint.startsWith('https://') || !s.keys?.p256dh || !s.keys?.auth) return null
    const known = new Set(getPlaces().map((p) => p.id))
    const places = (Array.isArray(b.places) ? b.places : []).filter((id) => known.has(id)).slice(0, 6)
    const prefs = {
      rain: !!b.prefs?.rain,
      alerts: !!b.prefs?.alerts,
      morning: !!b.prefs?.morning,
      hourly: !!b.prefs?.hourly,
      hourlyChanged: !!b.prefs?.hourlyChanged,
    }
    return {
      sub: { endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) } },
      places,
      prefs,
      lang: isLang(b.lang) ? b.lang : 'en',
    }
  }

  async function subscribe(body) {
    const e = validEntry(body)
    if (!e) return null
    state.subs[e.sub.endpoint] = { ...e, created: state.subs[e.sub.endpoint]?.created ?? now() }
    await save()
    return e
  }

  async function handleApi(req, res, url, readBody) {
    const json = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(obj))
    }
    const path = url.pathname
    if (req.method === 'GET' && path === '/api/push/key') return json(200, { key: state.vapid.publicKey })
    if (req.method !== 'POST') return json(405, { error: 'method' })
    if (!(req.headers['content-type'] ?? '').includes('application/json')) return json(415, { error: 'json only' })
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return json(400, { error: 'bad json' })
    }
    if (path === '/api/push/subscribe') {
      const e = await subscribe(body)
      return e ? json(200, { ok: true }) : json(400, { error: 'bad subscription' })
    }
    if (path === '/api/push/unsubscribe') {
      if (typeof body.endpoint === 'string' && state.subs[body.endpoint]) {
        delete state.subs[body.endpoint]
        await save()
      }
      return json(200, { ok: true })
    }
    if (path === '/api/push/state') {
      const e = state.subs[body.endpoint]
      return json(200, e ? { subscribed: true, places: e.places, prefs: e.prefs, lang: e.lang } : { subscribed: false })
    }
    if (path === '/api/push/test') {
      const e = state.subs[body.endpoint]
      if (!e) return json(404, { error: 'not subscribed' })
      const ok = await deliver(e, { ...testText(e.lang), tag: 'test', url: '/' })
      return json(ok ? 200 : 502, { ok })
    }
    return json(404, { error: 'not found' })
  }

  /** One scheduler pass. Returns the number of notifications sent. */
  async function tick() {
    const t = now()
    const cities = getPlaces()
    const entries = Object.values(state.subs).filter((e) => e.places.length && (e.prefs.rain || e.prefs.alerts || e.prefs.morning || e.prefs.hourly))
    const ids = [...new Set(entries.flatMap((e) => e.places))].filter((id) => cities.some((p) => p.id === id))
    const snaps = {}
    for (const id of ids) {
      try {
        snaps[id] = await fetchSnapshot(cities.find((p) => p.id === id), fetchJson)
      } catch {
        /* skip this place this round */
      }
    }

    let count = 0
    const once = (key, ttl) => {
      if (state.sent[key] && t - state.sent[key] < ttl) return false
      state.sent[key] = t
      return true
    }

    for (const e of entries) {
      for (const id of e.places) {
        const place = cities.find((p) => p.id === id)
        const w = snaps[id]
        if (!place || !w) continue
        const name = await placeName(place, e.lang)
        const base = `${e.sub.endpoint}|${id}`

        if (e.prefs.rain) {
          const nc = nowcast(w.minutely, t)
          if (nc.kind === 'soon' && nc.minutes <= 45 && once(`${base}|rain`, 3 * HOUR)) {
            if (await deliver(e, { title: name, body: nowcastText(nc, e.lang), tag: `rain-${id}`, url: '/' })) count++
          }
        }

        if (e.prefs.alerts) {
          for (const a of alertsFor({ current: w.current, daily0: w.daily0, air: w.air, hourly: w.hourly, now: t })) {
            const pushable = a.id === 'storm' ? a.level >= 2 : (a.id === 'aqi' || a.id === 'heat' || a.id === 'humid') && a.level >= 2
            if (!pushable) continue
            const ttl = a.id === 'storm' ? 6 * HOUR : 12 * HOUR
            if (!once(`${base}|alert|${a.id}|${a.level}`, ttl)) continue
            const txt = alertText(a, e.lang)
            if (await deliver(e, { title: `${name}: ${txt.title}`, body: txt.body, tag: `${a.id}-${id}`, url: '/' })) count++
          }
        }

        if (e.prefs.morning) {
          const local = (((t / MIN + place.utcOffsetMin) % 1440) + 1440) % 1440
          const day = new Date(t + place.utcOffsetMin * MIN).toISOString().slice(0, 10)
          if (local >= 450 && local < 510 && once(`${base}|morning|${day}`, 20 * HOUR)) {
            const txt = morningText(
              {
                placeName: name,
                temp: Math.round(w.current.temp),
                code: w.daily0.code,
                hi: Math.round(w.daily0.tMax),
                lo: Math.round(w.daily0.tMin),
                rainPct: w.daily0.precipProbMax,
              },
              e.lang,
            )
            if (await deliver(e, { ...txt, tag: `morning-${id}`, url: '/' })) count++
          }
        }

        if (e.prefs.hourly) {
          const local = (((t / MIN + place.utcOffsetMin) % 1440) + 1440) % 1440
          const hour = Math.floor(local / 60)
          if (hour >= 7 && hour <= 22 && local % 60 < 12) {
            const day = new Date(t + place.utcOffsetMin * MIN).toISOString().slice(0, 10)
            if (once(`${base}|hourly|${day}|${hour}`, 50 * MIN)) {
              const alerts = alertsFor({ current: w.current, daily0: w.daily0, air: w.air, hourly: w.hourly, now: t })
              const rainRc = rainChance(w.rainProb, t)
              const digest = hourlyDigest({ temp: w.current.temp, code: w.current.code, alerts, rainP: rainRc?.p ?? 0 })
              if (!e.prefs.hourlyChanged || hourlyChanged(state.digests[base], digest)) {
                const top = alerts.find((a) => a.id !== 'umbrella') ?? alerts[0]
                const txt = hourlyText(
                  {
                    placeName: name,
                    temp: Math.round(w.current.temp),
                    feels: Math.round(w.current.feelsLike),
                    code: w.current.code,
                    rainRc,
                    offMin: place.utcOffsetMin,
                    alertTitle: top ? alertText(top, e.lang).title : undefined,
                  },
                  e.lang,
                )
                // same tag per place: the new update silently replaces the previous one
                if (await deliver(e, { ...txt, tag: `hourly-${id}`, url: '/' })) {
                  count++
                  state.digests[base] = digest
                }
              }
            }
          }
        }
      }
    }

    for (const [k, v] of Object.entries(state.sent)) if (t - v > 2 * 24 * HOUR) delete state.sent[k]
    await save()
    return count
  }

  return { init, handleApi, tick, subscribe, get state() { return state } }
}
