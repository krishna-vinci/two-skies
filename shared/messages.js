// Text shared by the UI and push notifications. Wording lives in shared/locales/*.json;
// this file only decides which keys to use and fills in the numbers.
import { hasMessage, message } from './i18n.js'
import { formatDuration } from './format.js'

const ALERT_MAX_LEVEL = { aqi: 3, heat: 3, uv: 2, storm: 2, humid: 3, umbrella: 1 }

/** -> { title, body } */
export function alertText(alert, lang) {
  const level = Math.min(alert.level, ALERT_MAX_LEVEL[alert.id] ?? 1)
  const key = `alert.${alert.id}.${level}`
  const vars = { v: alert.value }
  return { title: message(lang, `${key}.title`, vars), body: message(lang, `${key}.body`, vars) }
}

export function nowcastText(nc, lang) {
  if (!['soon', 'ending', 'now', 'dry'].includes(nc.kind)) return ''
  return message(lang, `nowcast.${nc.kind}`, { t: nc.minutes ? formatDuration(nc.minutes, lang) : '' })
}

export const weatherLabel = (code, lang) =>
  message(lang, hasMessage('en', `wx.${code}`) ? `wx.${code}` : 'wx.default')

/** Morning summary push. */
export function morningText({ placeName, temp, code, hi, lo, rainPct }, lang) {
  return {
    title: `${placeName} · ${temp}°`,
    body: message(lang, 'morning.body', { label: weatherLabel(code, lang), hi, lo, rain: rainPct }),
  }
}

export const testText = (lang) => ({ title: 'Two Skies', body: message(lang, 'push.test') })

const hh = (ms, offMin) => String(new Date(ms + offMin * 60_000).getUTCHours()).padStart(2, '0')

/** "60% chance of rain around 15:00" */
export function rainChanceText(rc, offMin, lang) {
  return message(lang, 'rainChance', { p: Math.round(rc.p * 100), at: `${hh(rc.time, offMin)}:00` })
}

/** Hourly update push: label, feels-like, rain chance and the top alert, joined with a middle dot. */
export function hourlyText({ placeName, temp, feels, code, rainRc, offMin, alertTitle }, lang) {
  const parts = [weatherLabel(code, lang)]
  if (Math.abs(feels - temp) >= 2) parts.push(message(lang, 'hourly.feels', { n: feels }))
  if (rainRc && rainRc.p >= 0.3) parts.push(rainChanceText(rainRc, offMin, lang))
  if (alertTitle) parts.push(alertTitle)
  return { title: `${placeName} · ${temp}°`, body: parts.join(' · ') }
}
