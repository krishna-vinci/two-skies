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

/** Minutes since `ms` as a translation key + vars (caller translates). */
export function agoParts(ms: number, now: number): { key: 'justNow' | 'minAgo' | 'hourAgo'; n: number } {
  const m = Math.max(0, Math.round((now - ms) / 60_000))
  if (m < 1) return { key: 'justNow', n: 0 }
  if (m < 60) return { key: 'minAgo', n: m }
  return { key: 'hourAgo', n: Math.round(m / 60) }
}
