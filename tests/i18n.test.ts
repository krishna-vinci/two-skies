import { expect, test } from 'vitest'
import { LOCALES, DEFAULT_LANG } from '../shared/locales/index.js'
import { hasMessage, interpolate, isLang, message } from '../shared/i18n.js'
import { formatDuration, relativeAgo } from '../shared/format.js'
import { alertText, nowcastText, weatherLabel } from '../shared/messages.js'
import { detectLang } from '../src/lib/i18n'

const en = LOCALES[DEFAULT_LANG].messages
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

test('every locale: only known keys, same {placeholders} as English, no empty strings', () => {
  for (const [code, l] of Object.entries(LOCALES)) {
    expect(['ltr', 'rtl'], code).toContain(l.dir)
    expect(l.name.length, code).toBeGreaterThan(0)
    expect(() => new Intl.NumberFormat(l.intl), code).not.toThrow()
    for (const [k, v] of Object.entries(l.messages)) {
      expect(en[k], `${code}: unknown key "${k}"`).toBeDefined()
      expect(v.trim().length, `${code}: "${k}" is empty`).toBeGreaterThan(0)
      expect(placeholders(v), `${code}: "${k}" placeholders`).toEqual(placeholders(en[k]))
    }
  }
})

test('English has every weather code and alert the app can ask for', () => {
  for (const c of [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]) expect(en[`wx.${c}`], `wx.${c}`).toBeDefined()
  expect(en['wx.default']).toBeDefined()
  const maxLevel = { aqi: 3, heat: 3, uv: 2, storm: 2, humid: 3, umbrella: 1 } as const
  for (const [id, n] of Object.entries(maxLevel)) for (let l = 1; l <= n; l++) for (const part of ['title', 'body']) expect(en[`alert.${id}.${l}.${part}`], `alert.${id}.${l}.${part}`).toBeDefined()
})

test('missing strings fall back to English; unknown languages too', () => {
  expect(message('th', 'now')).toBe(LOCALES.th.messages.now)
  expect(message('xx', 'now')).toBe(en.now)
  expect(message('en', 'no.such.key')).toBe('no.such.key')
  expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  expect(hasMessage('en', 'now')).toBe(true)
  expect(isLang('en')).toBe(true)
  expect(isLang('xx')).toBe(false)
  expect(isLang('__proto__')).toBe(false)
})

test('weather labels and alerts work in every shipped language', () => {
  for (const code of Object.keys(LOCALES)) {
    expect(weatherLabel(63, code).length).toBeGreaterThan(0)
    expect(weatherLabel(12345, code)).toBe(message(code, 'wx.default'))
    const a = alertText({ id: 'heat', level: 9, value: 44 }, code) // level clamps
    expect(a.body).toContain('44')
    expect(nowcastText({ kind: 'soon', minutes: 25 }, code)).not.toContain('{')
  }
})

test('durations and relative times come from Intl', () => {
  expect(formatDuration(90, 'en', 'narrow')).toBe('1h 30m')
  expect(formatDuration(0, 'en', 'narrow')).toBe('0m')
  expect(formatDuration(45, 'en', 'long')).toBe('45 minutes')
  expect(relativeAgo(5, 'en')).toBe('5 min ago')
  expect(relativeAgo(180, 'en')).toBe('3 hr ago')
  expect(formatDuration(90, 'th', 'narrow')).toContain('30')
})

test('detectLang: exact tag, then base language, then English', () => {
  expect(detectLang(['th-TH', 'en'])).toBe('th')
  expect(detectLang(['en-US'])).toBe('en')
  expect(detectLang(['xx-YY', 'th'])).toBe('th') // skips unknown, uses the next
  expect(detectLang(['xx'])).toBe(DEFAULT_LANG)
  expect(detectLang([])).toBe(DEFAULT_LANG)
})
