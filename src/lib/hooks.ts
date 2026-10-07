import { useEffect, useState } from 'react'
import { animate } from 'motion/react'
import { relativeAgo } from '../../shared/format.js'

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

/** "5 min ago" in the language, or `justNow` for under a minute. */
export function agoText(ms: number, now: number, lang: string, justNow: string): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000))
  return m < 1 ? justNow : relativeAgo(m, lang)
}
