// Locale-aware formatting through Intl, so no per-language wording is hand-written.
import { LOCALES } from './locales/index.js'

/** Intl locale for a language; digits stay Latin so numbers match the big temperature figures. */
export const intlLocale = (lang) => `${LOCALES[lang]?.intl ?? 'en-GB'}-u-nu-latn`

const unit = (lang, u, n, style) =>
  new Intl.NumberFormat(intlLocale(lang), { style: 'unit', unit: u, unitDisplay: style }).format(n)

/** 90 -> "1h 30m" (narrow) / "1 hr 30 min" (short) / "1 hour 30 minutes" (long), in the language. */
export function formatDuration(min, lang, style = 'short') {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h && r) return `${unit(lang, 'hour', h, style)} ${unit(lang, 'minute', r, style)}`
  if (h) return unit(lang, 'hour', h, style)
  return unit(lang, 'minute', r, style)
}

/** "5 min ago" / "2 hr ago" in the language. `min` is whole minutes, at least 1. */
export function relativeAgo(min, lang) {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: 'auto', style: 'short' })
  return min < 60 ? rtf.format(-min, 'minute') : rtf.format(-Math.round(min / 60), 'hour')
}
