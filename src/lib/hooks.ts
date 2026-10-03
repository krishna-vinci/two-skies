import { useEffect, useState } from 'react'
import { animate } from 'motion/react'

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Smoothly tweens between numeric values. */
export function useTween(value: number | undefined, duration = 1.1) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (value === undefined) return
    let from = 0
    setShown((cur) => (from = cur))
    const c = animate(from, value, { duration, ease: 'easeOut', onUpdate: setShown })
    return () => c.stop()
  }, [value, duration])
  return shown
}

export function ago(ms: number, now: number): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}
