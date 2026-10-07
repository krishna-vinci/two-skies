import { motion } from 'motion/react'
import { useState } from 'react'
import { SideEditor } from './SideEditor'
import { useConfig } from '../lib/config'
import { EXAMPLE_CONFIG } from '../lib/examples'
import { useI18n } from '../lib/i18n'
import type { SideConfig } from '../lib/types'

/** First run: pick the two skies. */
export function WelcomeScreen() {
  const { t, lang, setLang } = useI18n()
  const cfg = useConfig()
  const [step, setStep] = useState<0 | 1>(0)
  const [sides, setSides] = useState<[SideConfig, SideConfig]>([{ places: [] }, { places: [] }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setSide = (i: 0 | 1, v: SideConfig) => setSides((s) => (i === 0 ? [v, s[1]] : [s[0], v]))
  const ready = sides[step].places.length >= 1
  const finish = async (config: typeof EXAMPLE_CONFIG) => {
    setBusy(true)
    setError('')
    const ok = await cfg.save(config)
    if (!ok) setError(t('saveFailed'))
    setBusy(false)
  }

  const primary = 'w-full rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-[#0b1020] transition active:scale-[0.99] disabled:opacity-40'

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ background: 'radial-gradient(120% 70% at 20% 0%, #3b5bdb 0%, transparent 55%), radial-gradient(100% 70% at 100% 100%, #f08a7a 0%, transparent 55%), #0b1020' }}
    >
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex justify-end">
          <button onClick={() => setLang(lang === 'en' ? 'th' : 'en')} className="glass px-3.5 py-1.5 text-xs font-normal" style={{ borderRadius: 999 }}>
            {t('langToggle')}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-6 text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.35)]" />
          <h1 className="mt-5 text-4xl font-extralight tracking-tight">{t('welcomeTitle')}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] font-light text-white/75">{t('welcomeSub')}</p>
        </motion.div>

        <div className="mt-6 flex justify-center gap-2" aria-hidden>
          {[0, 1].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-white' : 'w-1.5 bg-white/35'}`} />
          ))}
        </div>

        <div className="mt-5 flex-1">
          <SideEditor
            key={step}
            title={step === 0 ? t('welcomeStepA') : t('welcomeStepB')}
            hint={step === 0 ? t('welcomeHintA') : t('welcomeHintB')}
            value={sides[step]}
            onChange={(v) => setSide(step, v)}
            takenIds={new Set(sides[step === 0 ? 1 : 0].places.map((p) => p.id))}
          />
        </div>

        {error && <p className="mt-3 text-center text-sm font-light text-rose-200">{error}</p>}

        <div className="mt-5 space-y-3">
          {step === 0 ? (
            <button className={primary} style={{ background: 'linear-gradient(90deg,#fde68a,#fdba74)' }} disabled={!ready} onClick={() => setStep(1)}>
              {t('welcomeNext')}
            </button>
          ) : (
            <>
              <button className={primary} style={{ background: 'linear-gradient(90deg,#fde68a,#fdba74)' }} disabled={!ready || busy} onClick={() => finish({ sides, awake: { from: 7, to: 23 } })}>
                {t('welcomeDone')}
              </button>
              <button className="w-full py-1 text-sm font-light text-white/70 underline" onClick={() => setStep(0)}>
                {t('welcomeBack')}
              </button>
            </>
          )}
          {step === 0 && (
            <button className="w-full py-1 text-sm font-light text-white/70 underline" disabled={busy} onClick={() => finish(EXAMPLE_CONFIG)}>
              {t('useExample')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
