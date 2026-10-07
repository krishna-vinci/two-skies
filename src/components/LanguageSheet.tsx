import { Sheet } from './Sheet'
import { LANGS, detectLang, useI18n, type LangPref } from '../lib/i18n'

/** Pick the interface language: "Automatic" follows the device, or any shipped language by its own name. */
export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const { t, pref, setLang } = useI18n()
  const auto = LANGS.find((l) => l.code === detectLang())

  const choose = (p: LangPref) => {
    setLang(p)
    onClose()
  }
  const row = (key: string, active: boolean, label: string, hint?: string, onPick?: () => void, lang?: string, dir?: 'ltr' | 'rtl') => (
    <li key={key}>
      <button
        onClick={onPick}
        aria-pressed={active}
        lang={lang}
        dir={dir}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start transition ${active ? 'bg-white/20' : 'hover:bg-white/10'}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-light">{label}</span>
          {hint && <span className="block truncate text-xs font-light text-white/55">{hint}</span>}
        </span>
        {active && <span className="shrink-0 text-white/80">✓</span>}
      </button>
    </li>
  )

  return (
    <Sheet title={t('language')} onClose={onClose}>
      <ul className="space-y-0.5">
        {row('auto', pref === 'auto', t('languageAuto'), auto?.name, () => choose('auto'))}
        {LANGS.map((l) => row(l.code, pref === l.code, l.name, undefined, () => choose(l.code), l.code, l.dir))}
      </ul>
    </Sheet>
  )
}
