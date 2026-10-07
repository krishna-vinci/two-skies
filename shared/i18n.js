// Message lookup shared by the app and the server (push notifications).
import { DEFAULT_LANG, LOCALES } from './locales/index.js'

export const interpolate = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? `{${k}}`))

export const isLang = (code) => typeof code === 'string' && Object.prototype.hasOwnProperty.call(LOCALES, code)

/** Look up `key` in `lang`, fall back to English, then to the key itself. */
export function message(lang, key, vars) {
  const s = LOCALES[lang]?.messages[key] ?? LOCALES[DEFAULT_LANG].messages[key] ?? key
  return interpolate(s, vars)
}

export const hasMessage = (lang, key) => LOCALES[lang]?.messages[key] !== undefined
