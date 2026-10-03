import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { CoupleChip } from './components/CoupleChip'
import { DebugPanel, isDebug } from './components/DebugPanel'
import { DetailView, type Rect } from './components/Detail/DetailView'
import { SkyPanel } from './components/SkyPanel'
import { DEFAULT_PLACE, placeById, placesFor } from './lib/places'
import type { Owner } from './lib/types'
import type { SkyInput } from './sky/skyState'

type Selection = Record<Owner, string>
const KEY = 'ts.selection'

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

export default function App() {
  const [sel, setSel] = useState<Selection>(loadSelection)
  const [open, setOpen] = useState<{ owner: Owner; from: Rect } | null>(() => {
    const o = isDebug() ? new URLSearchParams(window.location.search).get('open') : null
    return o === 'him' || o === 'her' ? { owner: o, from: { top: 0, left: 0, right: 0, bottom: 0 } } : null
  })
  const [debug, setDebug] = useState<SkyInput | null>(null)
  const onDebug = useCallback((i: SkyInput) => setDebug(i), [])
  const showDebug = isDebug()

  // Back button / swipe-back closes the detail view instead of leaving the app.
  useEffect(() => {
    const onPop = () => setOpen(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openDetail = (owner: Owner, from: Rect) => {
    window.history.pushState({ detail: true }, '')
    setOpen({ owner, from })
  }
  const closeDetail = () => {
    if (window.history.state?.detail) window.history.back()
    else setOpen(null)
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
    return list[(i + 1) % list.length].name
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
            openDetail(o, {
              top: r.top,
              left: r.left,
              right: window.innerWidth - r.right,
              bottom: window.innerHeight - r.bottom,
            })
          }
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-white/25 md:inset-y-0 md:left-1/2 md:right-auto md:h-auto md:w-px" />
      <CoupleChip him={placeById(sel.him)} her={placeById(sel.her)} />

      <AnimatePresence>
        {open && <DetailView key="detail" place={placeById(sel[open.owner])} from={open.from} override={showDebug ? debug : null} onClose={closeDetail} />}
      </AnimatePresence>

      {showDebug && <DebugPanel onChange={onDebug} />}
    </div>
  )
}
