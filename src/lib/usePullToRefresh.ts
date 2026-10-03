import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type RefObject } from 'react'

export const PULL_THRESHOLD = 64
const RESISTANCE = 0.55
const MAX_PULL = 120
const SLOP = 8

/** Finger travel (px) -> indicator travel (px), with resistance and a cap. */
export const pullDistance = (dy: number) => Math.min(MAX_PULL, Math.max(0, dy) * RESISTANCE)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const buzz = (ms: number) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}

/**
 * Pull down from the top of `ref` to refetch every weather query.
 * Returns what the indicator needs to render.
 */
export function usePullToRefresh(ref: RefObject<HTMLElement | null>, enabled = true) {
  const qc = useQueryClient()
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const s = useRef({ startY: 0, active: false, pulled: false, busy: false, armed: false, pull: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    const st = s.current
    const atTop = () => el.scrollTop <= 0

    const onStart = (e: TouchEvent) => {
      if (st.busy || e.touches.length !== 1) return
      st.startY = e.touches[0].clientY
      st.active = atTop()
      st.pulled = false
      st.armed = false
    }

    const onMove = (e: TouchEvent) => {
      if (!st.active || st.busy) return
      const dy = e.touches[0].clientY - st.startY
      if (dy <= SLOP) {
        if (st.pulled) {
          st.pulled = false
          st.pull = 0
          setPull(0)
          setDragging(false)
        }
        return
      }
      if (!atTop() && !st.pulled) {
        st.active = false
        return
      }
      st.pulled = true
      e.preventDefault() // stop native overscroll / bounce while we own the gesture
      st.pull = pullDistance(dy)
      setDragging(true)
      setPull(st.pull)
      const armed = st.pull >= PULL_THRESHOLD
      if (armed !== st.armed) {
        st.armed = armed
        if (armed) buzz(8)
      }
    }

    const onEnd = async (e: TouchEvent) => {
      if (!st.active) return
      st.active = false
      if (!st.pulled) return
      e.preventDefault() // don't let the drag end count as a tap on a panel
      setDragging(false)
      if (st.pull < PULL_THRESHOLD) {
        st.pull = 0
        setPull(0)
        return
      }
      st.busy = true
      setRefreshing(true)
      setPull(PULL_THRESHOLD * 0.9)
      try {
        await Promise.all([qc.refetchQueries({ queryKey: ['weather'], type: 'active' }), sleep(800)])
        buzz(12)
      } finally {
        st.busy = false
        st.pull = 0
        setRefreshing(false)
        setPull(0)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    el.addEventListener('touchcancel', onEnd, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref, enabled, qc])

  return { pull, dragging, refreshing }
}
