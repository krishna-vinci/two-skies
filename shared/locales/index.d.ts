export interface Locale {
  /** The language's own name, shown in the picker */
  name: string
  dir: 'ltr' | 'rtl'
  /** BCP-47 tag for Intl (dates, numbers, units) */
  intl: string
  messages: Record<string, string>
}
export const LOCALES: Record<string, Locale>
export const DEFAULT_LANG: string
