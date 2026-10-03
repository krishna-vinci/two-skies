import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { CoupleChip } from './components/CoupleChip'
import { DebugPanel, isDebug } from './components/DebugPanel'
import { DetailView, type Rect } from './components/Detail/DetailView'
import { NotifySheet } from './components/NotifySheet'
import { SkyPanel } from './components/SkyPanel'
import { TogetherSheet } from './components/TogetherSheet'
import { DEFAULT_PLACE, placeById, placesFor } from './lib/places'
import { placeLabels, useI18n } from './lib/i18n'
import type { Owner } from './lib/types'
import type { SkyInput } from './sky/skyState'

type Selection = Record<Owner, string>
type Overlay = { kind: 'detail'; owner: Owner; from: Rect } | { kind: 'together' } | { kind: 'notify' } | null
const KEY = 'ts.selection'
const FULL: Rect = { top: 0, left: 0, right: 0, bottom: 0 }

function loadSelection(): Selection {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw?.him && raw?.her) {
      placeById(raw.him)
      placeById(raw.her)
      return raw
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_PLACE }
}

function initialOverlay(): Overlay {
  if (!isDebug()) return null
  const o = new URLSearchParams(window.location.search).get('open')
  if (o === 'him' || o === 'her') return { kind: 'detail', owner: o, from: FULL }
  if (o === 'together' || o === 'notify') return { kind: o }
  return null
}

export default function App() {
  const { lang } = useI18n()
  const [sel, setSel] = useState<Selection>(loadSelection)
  const [overlay, setOverlay] = useState<Overlay>(initialOverlay)
  const [debug, setDebug] = useState<SkyInput | null>(null)
  const onDebug = useCallback((i: SkyInput) => setDebug(i), [])
  const showDebug = isDebug()

  // Back button / swipe-back closes the top overlay instead of leaving the app.
  useEffect(() => {
    const onPop = () => setOverlay(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openOverlay = (o: NonNullable<Overlay>) => {
    window.history.pushState({ overlay: true }, '')
    setOverlay(o)
  }
  const closeOverlay = () => {
    if (window.history.state?.overlay) window.history.back()
    else setOverlay(null)
  }

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sel))
    } catch {
      /* storage unavailable */
    }
  }, [sel])

  const owners: Owner[] = ['him', 'her']
  const cycle = (o: Owner) => {
    const ids = placesFor(o).map((p) => p.id)
    setSel((s) => ({ ...s, [o]: ids[(ids.indexOf(s[o]) + 1) % ids.length] }))
  }
  const nextName = (o: Owner) => {
    const list = placesFor(o)
    const i = list.findIndex((p) => p.id === sel[o])
    return placeLabels(list[(i + 1) % list.length], lang).title
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
      {owners.map((o, i) => (
        <SkyPanel
          key={o}
          index={i}
          place={placeById(sel[o])}
          nextName={nextName(o)}
          override={showDebug ? debug : null}
          onSwitch={() => cycle(o)}
          onOpen={(r) =>
            openOverlay({
              kind: 'detail',
              owner: o,
              from: { top: r.top, left: r.left, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom },
            })
          }
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-white/25 md:inset-y-0 md:left-1/2 md:right-auto md:h-auto md:w-px" />
      <CoupleChip
        him={placeById(sel.him)}
        her={placeById(sel.her)}
        onTogether={() => openOverlay({ kind: 'together' })}
        onNotify={() => openOverlay({ kind: 'notify' })}
      />

      <AnimatePresence>
        {overlay?.kind === 'detail' && (
          <DetailView key="detail" place={placeById(sel[overlay.owner])} from={overlay.from} override={showDebug ? debug : null} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'together' && (
          <TogetherSheet key="together" him={placeById(sel.him)} her={placeById(sel.her)} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'notify' && (
          <NotifySheet key="notify" defaultPlaces={[sel.him, sel.her]} onClose={closeOverlay} />
        )}
      </AnimatePresence>

      {showDebug && <DebugPanel onChange={onDebug} />}
    </div>
  )
}
