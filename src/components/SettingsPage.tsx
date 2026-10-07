import { motion } from 'motion/react'
import { useState } from 'react'
import { Bell, Chevron } from './icons'
import { SideEditor } from './SideEditor'
import { useConfig } from '../lib/config'
import { EXAMPLE_CONFIG } from '../lib/examples'
import { LANGS, useI18n } from '../lib/i18n'
import type { AppConfig, SideConfig } from '../lib/types'

const select = 'rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-[15px] font-light outline-none focus:border-white/50'

/** Full page: edit our two skies, language, waking hours, notifications. */
export function SettingsPage({ onOpenNotify, onOpenLanguage, onClose }: { onOpenNotify: () => void; onOpenLanguage: () => void; onClose: () => void }) {
  const { t, lang, pref } = useI18n()
  const cfg = useConfig()
  const base: AppConfig = cfg.config ?? EXAMPLE_CONFIG
  const [draft, setDraft] = useState<AppConfig>(() => structuredClone(base))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(base)
  const hoursOk = draft.awake.from < draft.awake.to
  const setSide = (i: 0 | 1, v: SideConfig) =>
    setDraft((d) => ({ ...d, sides: i === 0 ? [v, d.sides[1]] : [d.sides[0], v] }))
  const taken = (i: 0 | 1) => new Set(draft.sides[i === 0 ? 1 : 0].places.map((p) => p.id))

  const save = async () => {
    if (!hoursOk) return
    setBusy(true)
    setMsg(null)
    const ok = await cfg.save(draft)
    setBusy(false)
    setMsg(ok ? { ok, text: t('saved') } : { ok, text: t('saveFailed') })
  }

  const hours = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const hh = (n: number) => `${String(n).padStart(2, '0')}:00`

  return (
    <motion.div
      className="fixed inset-0 z-40"
      style={{ background: 'radial-gradient(120% 70% at 20% 0%, #26397a 0%, transparent 60%), radial-gradient(100% 60% at 100% 100%, #4a2a55 0%, transparent 60%), #0b1020' }}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl space-y-4 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label={t('back')} className="glass flex h-11 w-11 shrink-0 items-center justify-center" style={{ borderRadius: 999 }}>
              <Chevron />
            </button>
            <div>
              <h1 className="text-2xl font-light tracking-tight">{t('settings')}</h1>
              <p className="text-sm font-light text-white/60">{t('settingsSub')}</p>
            </div>
          </div>

          <h2 className="px-1 pt-2 text-[11px] uppercase tracking-[0.18em] text-white/55">{t('ourSkies')}</h2>
          <SideEditor title={t('welcomeStepA')} value={draft.sides[0]} onChange={(v) => setSide(0, v)} takenIds={taken(0)} />
          <SideEditor title={t('welcomeStepB')} value={draft.sides[1]} onChange={(v) => setSide(1, v)} takenIds={taken(1)} />

          <button onClick={onOpenLanguage} className="glass flex w-full items-center justify-between p-5 text-start transition active:scale-[0.99]">
            <span>
              <span className="block text-lg font-light tracking-tight">{t('language')}</span>
              <span className="block text-sm font-light text-white/60">{pref === 'auto' ? t('languageAuto') : LANGS.find((l) => l.code === lang)?.name}</span>
            </span>
            <span className="text-white/60 rtl:rotate-180">›</span>
          </button>

          <section className="glass p-5">
            <h3 className="text-lg font-light tracking-tight">{t('wakingHours')}</h3>
            <p className="mt-0.5 text-sm font-light text-white/60">{t('wakingHoursHint')}</p>
            <div className="mt-3 flex items-center gap-3 text-sm font-light">
              <label className="flex items-center gap-2">
                {t('from')}
                <select className={select} value={draft.awake.from} onChange={(e) => setDraft({ ...draft, awake: { ...draft.awake, from: Number(e.target.value) } })}>
                  {hours(0, 22).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                {t('to')}
                <select className={select} value={draft.awake.to} onChange={(e) => setDraft({ ...draft, awake: { ...draft.awake, to: Number(e.target.value) } })}>
                  {hours(1, 24).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                </select>
              </label>
            </div>
            {!hoursOk && <p className="mt-2 text-sm font-light text-rose-200">{t('from')} &lt; {t('to')}</p>}
          </section>

          <button onClick={onOpenNotify} className="glass flex w-full items-center justify-between p-5 text-start transition active:scale-[0.99]">
            <span>
              <span className="block text-lg font-light tracking-tight">{t('notifications')}</span>
              <span className="block text-sm font-light text-white/60">{t('notifyIntro')}</span>
            </span>
            <Bell size={20} />
          </button>

          <section className="px-1 pt-2">
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-white/55">{t('about')}</h3>
            <p className="mt-1.5 text-sm font-light text-white/60">{t('aboutText')}</p>
          </section>
        </div>
      </div>

      {(dirty || msg) && (
        <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" style={{ background: 'linear-gradient(to top, #0b1020 55%, transparent)' }}>
          <div className="mx-auto max-w-2xl">
            {msg && <p className={`mb-2 text-center text-sm font-light ${msg.ok ? 'text-emerald-200' : 'text-rose-200'}`}>{msg.text}</p>}
            {dirty && (
              <button onClick={save} disabled={busy || !hoursOk} className="w-full rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-[#0b1020] transition active:scale-[0.99] disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#fde68a,#fdba74)' }}>
                {t('save')}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
