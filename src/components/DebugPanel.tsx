import { useEffect, useState } from 'react'
import type { SkyInput } from '../sky/skyState'

export const isDebug = () => new URLSearchParams(window.location.search).has('debug')

const CODES: [number, string][] = [
  [0, 'Clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [53, 'Drizzle'],
  [63, 'Rain'],
  [65, 'Heavy rain'],
  [73, 'Snow'],
  [95, 'Thunderstorm'],
]

export function altitudeForHour(h: number) {
  return Math.max(-30, 65 * Math.sin((Math.PI * (h - 6)) / 12))
}

const params = new URLSearchParams(window.location.search)

export function DebugPanel({ onChange }: { onChange: (i: SkyInput) => void }) {
  const [hour, setHour] = useState(Number(params.get('h') ?? 12))
  const [code, setCode] = useState(Number(params.get('code') ?? 0))
  const [cloud, setCloud] = useState(Number(params.get('cloud') ?? 20))
  const [wind, setWind] = useState(Number(params.get('wind') ?? 8))
  const [moon, setMoon] = useState(Number(params.get('moon') ?? 0.3))

  useEffect(() => {
    onChange({
      code,
      isDay: hour >= 6 && hour <= 18,
      sunAltitude: altitudeForHour(hour),
      cloudCover: cloud,
      windSpeed: wind,
      moonPhase: moon,
      sunProgress: Math.min(1, Math.max(0, (hour - 6) / 12)),
    })
  }, [hour, code, cloud, wind, moon, onChange])

  const row = 'flex items-center gap-2 text-xs'
  return (
    <div className="glass fixed bottom-3 left-3 z-50 w-64 space-y-2 p-3" style={{ borderRadius: 18 }}>
      <label className={row}>
        <span className="w-12">Hour</span>
        <input type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(e) => setHour(+e.target.value)} className="flex-1" />
        <span className="w-10 text-right">{hour.toFixed(2)}</span>
      </label>
      <label className={row}>
        <span className="w-12">Sky</span>
        <select className="flex-1 rounded bg-black/40 p-1" value={code} onChange={(e) => setCode(+e.target.value)}>
          {CODES.map(([c, l]) => (
            <option key={c} value={c}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className={row}>
        <span className="w-12">Cloud</span>
        <input type="range" min={0} max={100} value={cloud} onChange={(e) => setCloud(+e.target.value)} className="flex-1" />
      </label>
      <label className={row}>
        <span className="w-12">Wind</span>
        <input type="range" min={0} max={60} value={wind} onChange={(e) => setWind(+e.target.value)} className="flex-1" />
      </label>
      <label className={row}>
        <span className="w-12">Moon</span>
        <input type="range" min={0} max={1} step={0.01} value={moon} onChange={(e) => setMoon(+e.target.value)} className="flex-1" />
      </label>
    </div>
  )
}
