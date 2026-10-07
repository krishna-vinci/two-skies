import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { placeLabels, useI18n, type Key } from '../lib/i18n'
import { useConfig } from '../lib/config'
import { disablePush, enablePush, loadSettings, pushSupport, savePush, sendTest, type PushSettings } from '../lib/push'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-3 text-left text-[15px] font-light">
      <span>{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-400/80' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export function NotifySheet({ defaultPlaces, onClose }: { defaultPlaces: string[]; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { ourCities } = useConfig()
  const support = pushSupport()
  const [settings, setSettings] = useState<PushSettings>({
    places: defaultPlaces,
    prefs: { rain: true, alerts: true, morning: false, hourly: false, hourlyChanged: false },
    lang,
  })
  const [subscribed, setSubscribed] = useState<boolean | null>(support === 'ok' ? null : false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (support !== 'ok') return
    loadSettings()
      .then((s) => {
        setSubscribed(!!s)
        if (s) setSettings(s)
      })
      .catch(() => setSubscribed(false))
  }, [support])

  // keep the stored language in step with the UI
  useEffect(() => {
    if (subscribed && settings.lang !== lang) {
      const next = { ...settings, lang }
      setSettings(next)
      savePush(next).catch(() => {})
    }
  }, [lang, subscribed, settings])

  const fail = () => setMsg(t('notifyError'))
  const update = (next: PushSettings) => {
    setSettings(next)
    if (subscribed) savePush(next).catch(fail)
  }
  const togglePlace = (id: string) => {
    const has = settings.places.includes(id)
    update({ ...settings, places: has ? settings.places.filter((p) => p !== id) : [...settings.places, id] })
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch {
      fail()
    } finally {
      setBusy(false)
    }
  }

  const blockedKey: Key | null = support === 'needs-https' ? 'notifyHttps' : support === 'ios-install' ? 'notifyIosHint' : support === 'unsupported' ? 'notifyUnsupported' : null
  const btn = 'glass w-full px-4 py-3 text-[15px] font-normal transition active:scale-[0.98] disabled:opacity-50'

  return (
    <Sheet title={t('notifications')} subtitle={t('notifyIntro')} onClose={onClose}>
      {blockedKey ? (
        <div className="rounded-2xl bg-white/10 p-4 text-sm font-light text-white/85">{t(blockedKey)}</div>
      ) : (
        <>
          <div className="divide-y divide-white/10">
            <Toggle on={settings.prefs.rain} onChange={(v) => update({ ...settings, prefs: { ...settings.prefs, rain: v } })} label={t('notifyRain')} />
            <Toggle on={settings.prefs.alerts} onChange={(v) => update({ ...settings, prefs: { ...settings.prefs, alerts: v } })} label={t('notifyAlerts')} />
            <Toggle on={settings.prefs.morning} onChange={(v) => update({ ...settings, prefs: { ...settings.prefs, morning: v } })} label={t('notifyMorning')} />
            <Toggle on={settings.prefs.hourly} onChange={(v) => update({ ...settings, prefs: { ...settings.prefs, hourly: v } })} label={t('notifyHourly')} />
            {settings.prefs.hourly && (
              <div className="pl-4">
                <Toggle on={settings.prefs.hourlyChanged} onChange={(v) => update({ ...settings, prefs: { ...settings.prefs, hourlyChanged: v } })} label={t('notifyHourlyChanged')} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/60">{t('notifyPlaces')}</div>
            <div className="flex flex-wrap gap-2">
              {ourCities.map((p) => {
                const on = settings.places.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlace(p.id)}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-light transition ${on ? 'border-white/60 bg-white/20' : 'border-white/20 bg-transparent text-white/70'}`}
                  >
                    {placeLabels(p, lang).title}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {subscribed ? (
              <>
                <div className="text-center text-sm font-light text-emerald-200">{t('notifyOn')}</div>
                <button className={btn} disabled={busy} onClick={() => run(async () => { await sendTest(); setMsg(t('notifyTestSent')) })}>{t('notifyTest')}</button>
                <button className="w-full py-2 text-sm font-light text-white/65 underline" disabled={busy} onClick={() => run(async () => { await disablePush(); setSubscribed(false) })}>{t('notifyDisable')}</button>
              </>
            ) : (
              <button
                className={btn}
                disabled={busy || subscribed === null || settings.places.length === 0}
                onClick={() =>
                  run(async () => {
                    const r = await enablePush({ ...settings, lang })
                    if (r === 'denied') setMsg(t('notifyDenied'))
                    else setSubscribed(true)
                  })
                }
              >
                {t('notifyEnable')}
              </button>
            )}
            {msg && <div className="text-center text-sm font-light text-white/75">{msg}</div>}
          </div>
        </>
      )}
    </Sheet>
  )
}
