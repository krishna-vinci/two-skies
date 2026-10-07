import type { Alert, Nowcast } from './rules.js'
export type Lang = string
export function alertText(alert: Alert, lang: Lang): { title: string; body: string }
export function nowcastText(nc: Nowcast, lang: Lang): string
export function weatherLabel(code: number, lang: Lang): string
export function morningText(
  i: { placeName: string; temp: number; code: number; hi: number; lo: number; rainPct: number },
  lang: Lang,
): { title: string; body: string }
export function testText(lang: Lang): { title: string; body: string }
export function rainChanceText(rc: { p: number; time: number }, offMin: number, lang: Lang): string
export function hourlyText(
  i: { placeName: string; temp: number; feels: number; code: number; rainRc: { p: number; time: number } | null; offMin: number; alertTitle?: string },
  lang: Lang,
): { title: string; body: string }
