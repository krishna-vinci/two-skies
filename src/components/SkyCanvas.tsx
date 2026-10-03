import { useEffect, useRef } from 'react'
import { SkyEngine } from '../sky/engine'
import type { SkyState } from '../sky/skyState'

export function SkyCanvas({ state, className = '' }: { state: SkyState; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const engine = useRef<SkyEngine | null>(null)
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    const e = new SkyEngine(ref.current!)
    e.setState(latest.current)
    e.start()
    engine.current = e
    return () => {
      e.destroy()
      engine.current = null
    }
  }, [])

  useEffect(() => {
    engine.current?.setState(state)
  }, [state])

  return <canvas ref={ref} className={`absolute inset-0 h-full w-full ${className}`} />
}
