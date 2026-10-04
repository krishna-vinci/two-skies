import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CoupleChip } from './components/CoupleChip'
import { DebugPanel, isDebug } from './components/DebugPanel'
import { DetailView, type Rect } from './components/Detail/DetailView'
import { NotifySheet } from './components/NotifySheet'
import { PlacesSheet } from './components/PlacesSheet'
import { PullIndicator } from './components/PullIndicator'
import { SkyPanel } from './components/SkyPanel'
import { TogetherSheet } from './components/TogetherSheet'
import { DEFAULT_PLACE, PLACES, placeById } from './lib/places'
import { usePlaces } from './lib/placesStore'
import { usePullToRefresh } from './lib/usePullToRefresh'
import type { Owner, Place } from './lib/types'
import type { SkyInput } from './sky/skyState'

type Selection = Record<Owner, string>
type Overlay = { kind: 'detail'; owner: Owner; from: Rect } | { kind: 'places'; owner: Owner } | { kind: 'together' } | { kind: 'notify' } | null
const KEY = 'ts.selection'
const FULL: Rect = { top: 0, left: 0, right: 0, bottom: 0 }

function loadSelection(): Selection {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (typeof raw?.him === 'string' && typeof raw?.her === 'string') return { him: raw.him, her: raw.her }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_PLACE }
}

function initialOverlay(): Overlay {
  if (!isDebug()) return null
  const o = new URLSearchParams(window.location.search).get('open')
  if (o === 'him' || o === 'her') return { kind: 'detail', owner: o, from: FULL }
  if (o === 'places') return { kind: 'places', owner: 'her' }
  if (o === 'together' || o === 'notify') return { kind: o }
  return null
}

export default function App() {
  const { byId } = usePlaces()
  const [sel, setSel] = useState<Selection>(loadSelection)
  const [overlay, setOverlay] = useState<Overlay>(initialOverlay)
  const [debug, setDebug] = useState<SkyInput | null>(null)
  const onDebug = useCallback((i: SkyInput) => setDebug(i), [])
  const showDebug = isDebug()
  const rootRef = useRef<HTMLDivElement>(null)
  const ptr = usePullToRefresh(rootRef, overlay === null)

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
  // an added place that was removed (on any device) falls back to that person's default city
  const placeFor = (o: Owner): Place => byId(sel[o]) ?? placeById(DEFAULT_PLACE[o])
  const him = placeFor('him')
  const her = placeFor('her')
  const watchable = [sel.him, sel.her].filter((id) => PLACES.some((p) => p.id === id))

  return (
    <div ref={rootRef} className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
      <PullIndicator {...ptr} />
      {owners.map((o, i) => (
        <SkyPanel
          key={o}
          index={i}
          place={o === 'him' ? him : her}
          override={showDebug ? debug : null}
          onSwitch={() => openOverlay({ kind: 'places', owner: o })}
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
        him={him}
        her={her}
        onTogether={() => openOverlay({ kind: 'together' })}
        onNotify={() => openOverlay({ kind: 'notify' })}
      />

      <AnimatePresence>
        {overlay?.kind === 'detail' && (
          <DetailView key="detail" place={overlay.owner === 'him' ? him : her} from={overlay.from} override={showDebug ? debug : null} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'places' && (
          <PlacesSheet
            key="places"
            current={sel[overlay.owner]}
            onPick={(id) => {
              setSel((cur) => ({ ...cur, [overlay.owner]: id }))
              closeOverlay()
            }}
            onClose={closeOverlay}
          />
        )}
        {overlay?.kind === 'together' && (
          <TogetherSheet key="together" him={him} her={her} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'notify' && (
          <NotifySheet key="notify" defaultPlaces={watchable.length ? watchable : [DEFAULT_PLACE.him, DEFAULT_PLACE.her]} onClose={closeOverlay} />
        )}
      </AnimatePresence>

      {showDebug && <DebugPanel onChange={onDebug} />}
    </div>
  )
}
