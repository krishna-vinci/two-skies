import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CoupleChip } from './components/CoupleChip'
import { DebugPanel, isDebug } from './components/DebugPanel'
import { DetailView, type Rect } from './components/Detail/DetailView'
import { NotifySheet } from './components/NotifySheet'
import { PlacesPage } from './components/PlacesPage'
import { PullIndicator } from './components/PullIndicator'
import { SettingsPage } from './components/SettingsPage'
import { SkyPanel } from './components/SkyPanel'
import { TogetherSheet } from './components/TogetherSheet'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useConfig, type SideView } from './lib/config'
import { placeLabels, useI18n } from './lib/i18n'
import { usePlaces } from './lib/placesStore'
import type { Side } from './lib/types'
import { usePullToRefresh } from './lib/usePullToRefresh'
import type { SkyInput } from './sky/skyState'

type Selection = Record<Side, string>
type Overlay =
  | { kind: 'detail'; side: Side; from: Rect } // one of our two skies, opened from home
  | { kind: 'placeDetail'; placeId: string; from: Rect } // an added place, opened from the Places page
  | { kind: 'places' }
  | { kind: 'settings' }
  | { kind: 'together' }
  | { kind: 'notify' }
const SEL_KEY = 'ts.sel2'
const LEGACY_SEL_KEY = 'ts.selection' // { him, her } from before the sides were configurable
const FULL: Rect = { top: 0, left: 0, right: 0, bottom: 0 }

/** Keep a chosen city only if it still exists on that side; otherwise fall back to the side's default. */
function validate(raw: Partial<Selection> | null | undefined, sides: [SideView, SideView]): Selection {
  const pick = (s: SideView) => (s.places.some((p) => p.id === raw?.[s.id]) ? raw![s.id]! : s.places[0].id)
  return { a: pick(sides[0]), b: pick(sides[1]) }
}

function loadSelection(sides: [SideView, SideView]): Selection {
  try {
    const cur = JSON.parse(localStorage.getItem(SEL_KEY) ?? 'null')
    if (cur) return validate(cur, sides)
    const old = JSON.parse(localStorage.getItem(LEGACY_SEL_KEY) ?? 'null')
    if (old) return validate({ a: old.him, b: old.her }, sides)
  } catch {
    /* fall through */
  }
  return validate(null, sides)
}

function initialStack(): Overlay[] {
  if (!isDebug()) return []
  const o = new URLSearchParams(window.location.search).get('open')
  if (o === 'a' || o === 'b') return [{ kind: 'detail', side: o, from: FULL }]
  if (o === 'places' || o === 'settings' || o === 'together' || o === 'notify') return [{ kind: o }]
  return []
}

export default function App() {
  const cfg = useConfig()
  if (cfg.status === 'loading') return <div className="h-dvh w-full bg-[#0b1020]" />
  if (!cfg.configured) return <WelcomeScreen />
  return <Home />
}

function Home() {
  const { lang } = useI18n()
  const { sides, awake } = useConfig()
  const { byId } = usePlaces()
  const [sel, setSel] = useState<Selection>(() => loadSelection(sides))
  const [stack, setStack] = useState<Overlay[]>(initialStack)
  const [debug, setDebug] = useState<SkyInput | null>(null)
  const onDebug = useCallback((i: SkyInput) => setDebug(i), [])
  const showDebug = isDebug()
  const rootRef = useRef<HTMLDivElement>(null)
  const ptr = usePullToRefresh(rootRef, stack.length === 0)

  // the cities may have been edited in Settings (or on the other phone)
  useEffect(() => setSel((s) => validate(s, sides)), [sides])

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
      localStorage.setItem(SEL_KEY, JSON.stringify(sel))
    } catch {
      /* storage unavailable */
    }
  }, [sel])

  const placeOf = (s: SideView) => s.places.find((p) => p.id === sel[s.id]) ?? s.places[0]
  const cycle = (s: SideView) => {
    const i = s.places.findIndex((p) => p.id === sel[s.id])
    setSel((cur) => ({ ...cur, [s.id]: s.places[(i + 1) % s.places.length].id }))
  }
  const nextName = (s: SideView) => {
    const i = s.places.findIndex((p) => p.id === sel[s.id])
    return placeLabels(s.places[(i + 1) % s.places.length], lang).title
  }

  const rectOf = (r: DOMRect): Rect => ({
    top: r.top,
    left: r.left,
    right: window.innerWidth - r.right,
    bottom: window.innerHeight - r.bottom,
  })

  const [sa, sb] = sides
  const pa = placeOf(sa)
  const pb = placeOf(sb)
  const sideById = (id: Side) => (id === 'a' ? sa : sb)

  return (
    <div ref={rootRef} className="relative flex h-dvh w-full flex-col overflow-hidden md:flex-row">
      <PullIndicator {...ptr} />
      {sides.map((s, i) => (
        <SkyPanel
          key={s.id}
          index={i}
          place={placeOf(s)}
          label={s.label}
          canSwitch={s.places.length > 1}
          nextName={nextName(s)}
          override={showDebug ? debug : null}
          onSwitch={() => cycle(s)}
          onOpen={(r) => openOverlay({ kind: 'detail', side: s.id, from: rectOf(r) })}
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-white/25 md:inset-y-0 md:left-1/2 md:right-auto md:h-auto md:w-px" />
      <CoupleChip
        a={pa}
        b={pb}
        onTogether={() => openOverlay({ kind: 'together' })}
        onSettings={() => openOverlay({ kind: 'settings' })}
        onPlaces={() => openOverlay({ kind: 'places' })}
      />

      <AnimatePresence>
        {stack.map((o, i) => {
          const key = `${o.kind}-${i}`
          switch (o.kind) {
            case 'detail':
              return <DetailView key={key} place={placeOf(sideById(o.side))} from={o.from} override={showDebug ? debug : null} onClose={closeOverlay} />
            case 'placeDetail': {
              const p = byId(o.placeId)
              return p ? <DetailView key={key} place={p} from={o.from} onClose={closeOverlay} /> : null
            }
            case 'places':
              return <PlacesPage key={key} onOpenPlace={(p, r) => openOverlay({ kind: 'placeDetail', placeId: p.id, from: rectOf(r) })} onClose={closeOverlay} />
            case 'settings':
              return <SettingsPage key={key} onOpenNotify={() => openOverlay({ kind: 'notify' })} onClose={closeOverlay} />
            case 'together':
              return <TogetherSheet key={key} a={pa} b={pb} awake={awake} onClose={closeOverlay} />
            case 'notify':
              return <NotifySheet key={key} defaultPlaces={[pa.id, pb.id]} onClose={closeOverlay} />
          }
        })}
      </AnimatePresence>

      {showDebug && <DebugPanel onChange={onDebug} />}
    </div>
  )
}
