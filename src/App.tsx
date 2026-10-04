import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CoupleChip } from './components/CoupleChip'
import { DebugPanel, isDebug } from './components/DebugPanel'
import { DetailView, type Rect } from './components/Detail/DetailView'
import { NotifySheet } from './components/NotifySheet'
import { PlacesPage } from './components/PlacesPage'
import { PullIndicator } from './components/PullIndicator'
import { SkyPanel } from './components/SkyPanel'
import { TogetherSheet } from './components/TogetherSheet'
import { DEFAULT_PLACE, placeById, placesFor } from './lib/places'
import { usePlaces } from './lib/placesStore'
import { placeLabels, useI18n } from './lib/i18n'
import { usePullToRefresh } from './lib/usePullToRefresh'
import type { Owner } from './lib/types'
import type { SkyInput } from './sky/skyState'

type Selection = Record<Owner, string>
type Overlay =
  | { kind: 'detail'; owner: Owner; from: Rect } // one of our two cities, opened from home
  | { kind: 'placeDetail'; placeId: string; from: Rect } // an added place, opened from the Places page
  | { kind: 'places' }
  | { kind: 'together' }
  | { kind: 'notify' }
const KEY = 'ts.selection'
const FULL: Rect = { top: 0, left: 0, right: 0, bottom: 0 }

// Home only ever shows the four built-in cities; added places live on the Places page.
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

function initialStack(): Overlay[] {
  if (!isDebug()) return []
  const o = new URLSearchParams(window.location.search).get('open')
  if (o === 'him' || o === 'her') return [{ kind: 'detail', owner: o, from: FULL }]
  if (o === 'places' || o === 'together' || o === 'notify') return [{ kind: o }]
  return []
}

export default function App() {
  const { lang } = useI18n()
  const { byId } = usePlaces()
  const [sel, setSel] = useState<Selection>(loadSelection)
  const [stack, setStack] = useState<Overlay[]>(initialStack)
  const [debug, setDebug] = useState<SkyInput | null>(null)
  const onDebug = useCallback((i: SkyInput) => setDebug(i), [])
  const showDebug = isDebug()
  const rootRef = useRef<HTMLDivElement>(null)
  const ptr = usePullToRefresh(rootRef, stack.length === 0)

  // Back button / swipe-back closes the top overlay, one level at a time.
  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openOverlay = (o: Overlay) => {
    window.history.pushState({ overlay: true }, '')
    setStack((s) => [...s, o])
  }
  const closeOverlay = () => {
    if (window.history.state?.overlay) window.history.back()
    else setStack((s) => s.slice(0, -1))
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

  const rectOf = (r: DOMRect): Rect => ({
    top: r.top,
    left: r.left,
    right: window.innerWidth - r.right,
    bottom: window.innerHeight - r.bottom,
  })

  return (
    <div ref={rootRef} className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
      <PullIndicator {...ptr} />
      {owners.map((o, i) => (
        <SkyPanel
          key={o}
          index={i}
          place={placeById(sel[o])}
          nextName={nextName(o)}
          override={showDebug ? debug : null}
          onSwitch={() => cycle(o)}
          onOpen={(r) => openOverlay({ kind: 'detail', owner: o, from: rectOf(r) })}
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-white/25 md:inset-y-0 md:left-1/2 md:right-auto md:h-auto md:w-px" />
      <CoupleChip
        him={placeById(sel.him)}
        her={placeById(sel.her)}
        onTogether={() => openOverlay({ kind: 'together' })}
        onNotify={() => openOverlay({ kind: 'notify' })}
        onPlaces={() => openOverlay({ kind: 'places' })}
      />

      <AnimatePresence>
        {stack.map((o, i) => {
          const key = `${o.kind}-${i}`
          switch (o.kind) {
            case 'detail':
              return <DetailView key={key} place={placeById(sel[o.owner])} from={o.from} override={showDebug ? debug : null} onClose={closeOverlay} />
            case 'placeDetail': {
              const p = byId(o.placeId)
              return p ? <DetailView key={key} place={p} from={o.from} onClose={closeOverlay} /> : null
            }
            case 'places':
              return <PlacesPage key={key} onOpenPlace={(p, r) => openOverlay({ kind: 'placeDetail', placeId: p.id, from: rectOf(r) })} onClose={closeOverlay} />
            case 'together':
              return <TogetherSheet key={key} him={placeById(sel.him)} her={placeById(sel.her)} onClose={closeOverlay} />
            case 'notify':
              return <NotifySheet key={key} defaultPlaces={[sel.him, sel.her]} onClose={closeOverlay} />
          }
        })}
      </AnimatePresence>

      {showDebug && <DebugPanel onChange={onDebug} />}
    </div>
  )
}
