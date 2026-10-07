// Registry of interface languages. To add one, see docs/translating.md:
// copy en.json to <code>.json, translate the values, and add one line here.
import en from './en.json' with { type: 'json' }
import th from './th.json' with { type: 'json' }
import es from './es.json' with { type: 'json' }
import fr from './fr.json' with { type: 'json' }
import de from './de.json' with { type: 'json' }
import pt from './pt.json' with { type: 'json' }
import it from './it.json' with { type: 'json' }
import hi from './hi.json' with { type: 'json' }
import ja from './ja.json' with { type: 'json' }
import ko from './ko.json' with { type: 'json' }
import zh from './zh.json' with { type: 'json' }
import id from './id.json' with { type: 'json' }
import vi from './vi.json' with { type: 'json' }

/**
 * code -> { name (in its own language), dir, intl (BCP-47 tag used for dates, numbers, units), messages }
 * Missing strings fall back to English, so a partial translation still works.
 */
export const LOCALES = {
  en: { name: 'English', dir: 'ltr', intl: 'en-GB', messages: en },
  es: { name: 'Español', dir: 'ltr', intl: 'es-ES', messages: es },
  fr: { name: 'Français', dir: 'ltr', intl: 'fr-FR', messages: fr },
  de: { name: 'Deutsch', dir: 'ltr', intl: 'de-DE', messages: de },
  pt: { name: 'Português', dir: 'ltr', intl: 'pt-BR', messages: pt },
  it: { name: 'Italiano', dir: 'ltr', intl: 'it-IT', messages: it },
  hi: { name: 'हिन्दी', dir: 'ltr', intl: 'hi-IN', messages: hi },
  ja: { name: '日本語', dir: 'ltr', intl: 'ja-JP', messages: ja },
  ko: { name: '한국어', dir: 'ltr', intl: 'ko-KR', messages: ko },
  zh: { name: '简体中文', dir: 'ltr', intl: 'zh-CN', messages: zh },
  id: { name: 'Bahasa Indonesia', dir: 'ltr', intl: 'id-ID', messages: id },
  vi: { name: 'Tiếng Việt', dir: 'ltr', intl: 'vi-VN', messages: vi },
  th: { name: 'ไทย', dir: 'ltr', intl: 'th-TH', messages: th },
}

export const DEFAULT_LANG = 'en'
