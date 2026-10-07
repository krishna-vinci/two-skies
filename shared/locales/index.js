// Registry of interface languages. To add one, see docs/translating.md:
// copy en.json to <code>.json, translate the values, and add one line here.
import en from './en.json' with { type: 'json' }
import th from './th.json' with { type: 'json' }

/**
 * code -> { name (in its own language), dir, intl (BCP-47 tag used for dates, numbers, units), messages }
 * Missing strings fall back to English, so a partial translation still works.
 */
export const LOCALES = {
  en: { name: 'English', dir: 'ltr', intl: 'en-GB', messages: en },
  th: { name: 'ไทย', dir: 'ltr', intl: 'th-TH', messages: th },
}

export const DEFAULT_LANG = 'en'
