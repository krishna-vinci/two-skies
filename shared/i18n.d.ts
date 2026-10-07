export function interpolate(s: string, vars?: Record<string, string | number>): string
export function isLang(code: unknown): boolean
export function message(lang: string, key: string, vars?: Record<string, string | number>): string
export function hasMessage(lang: string, key: string): boolean
