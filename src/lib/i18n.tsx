import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { intlLocale } from '../../shared/format.js'
import { isLang, message } from '../../shared/i18n.js'
import { DEFAULT_LANG, LOCALES } from '../../shared/locales/index.js'
import type en from '../../shared/locales/en.json'
import { cachedName, namesVersion, subscribeNames, type NameEntry } from './placeNames'
import type { Place } from './types'

/** A language code from shared/locales (en, th, ...). */
export type Lang = string
/** Every UI string key (English is the source of truth). */
export type Key = keyof typeof en

/** All shipped languages, for the picker. */
export const LANGS = Object.entries(LOCALES).map(([code, l]) => ({ code, name: l.name, dir: l.dir }))

export const localeFor = intlLocale

/** Main title + secondary line for a place in the current language. */
export function placeLabels(p: Pick<Place, 'id' | 'name' | 'names' | 'subtitle'>, lang: Lang, looked?: NameEntry): { title: string; sub: string } {
  const local = p.names?.[lang] ?? looked?.name
  if (local && local !== p.name) return { title: local, sub: p.name }
  return { title: p.name, sub: p.subtitle ?? '' }
}

type Vars = Record<string, string | number>
export const translate = (lang: Lang, key: Key, vars?: Vars) => message(lang, key, vars)

/** The best shipped language for this device: exact tag, then base language (pt-BR -> pt). */
export function detectLang(tags: readonly string[] = navigator.languages ?? [navigator.language]): Lang {
  for (const tag of tags) {
    const t = tag.toLowerCase()
    if (isLang(t)) return t
    const base = t.split('-')[0]
    if (isLang(base)) return base
    if (t.startsWith('zh') && isLang('zh')) return 'zh'
  }
  return DEFAULT_LANG
}

/** 'auto' follows the device; otherwise a language code. */
export type LangPref = 'auto' | Lang

interface Ctx {
  lang: Lang
  /** what the person chose; 'auto' means "follow the device" */
  pref: LangPref
  setLang: (pref: LangPref) => void
  t: (key: Key, vars?: Vars) => string
  dir: 'ltr' | 'rtl'
  /** Title and subtitle for a place in the current language (looked-up names appear as they arrive) */
  label: (p: Pick<Place, 'id' | 'name' | 'names' | 'subtitle'>) => { title: string; sub: string }
}
const LangContext = createContext<Ctx | null>(null)
const STORE = 'ts.lang'

function initialPref(): LangPref {
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q && isLang(q)) return q
  try {
    const saved = localStorage.getItem(STORE)
    if (saved && isLang(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return 'auto'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<LangPref>(initialPref)
  const lang = pref === 'auto' ? detectLang() : pref
  const dir = LOCALES[lang].dir

  const setLang = useCallback((p: LangPref) => {
    setPref(p)
    try {
      if (p === 'auto') localStorage.removeItem(STORE)
      else localStorage.setItem(STORE, p)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const names = useSyncExternalStore(subscribeNames, namesVersion)
  const value = useMemo<Ctx>(
    () => ({ lang, pref, setLang, dir, t: (k, v) => translate(lang, k, v), label: (p) => placeLabels(p, lang, cachedName(p.id, lang)) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, pref, setLang, dir, names],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useI18n(): Ctx {
  const c = useContext(LangContext)
  if (!c) throw new Error('LangProvider missing')
  return c
}

export const DIR_KEYS: Key[] = ['dirN', 'dirNE', 'dirE', 'dirSE', 'dirS', 'dirSW', 'dirW', 'dirNW']
