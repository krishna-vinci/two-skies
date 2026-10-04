import type { Kind } from '../lib/weatherCodes'

const CLOUD = 'M7 19a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.8 4.6 4.6 0 0 1 17.5 19H7z'

export function WeatherIcon({ kind, isDay = true, size = 24, className = '' }: { kind: Kind; isDay?: boolean; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
  const sun = (cx: number, cy: number, r: number, rays = true) => (
    <g>
      <circle cx={cx} cy={cy} r={r} />
      {rays &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4
          return <line key={i} x1={cx + Math.cos(a) * (r + 2)} y1={cy + Math.sin(a) * (r + 2)} x2={cx + Math.cos(a) * (r + 4)} y2={cy + Math.sin(a) * (r + 4)} />
        })}
    </g>
  )
  const moon = <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />

  switch (kind) {
    case 'clear':
      return <svg {...common}>{isDay ? sun(12, 12, 4) : moon}</svg>
    case 'partly':
      return (
        <svg {...common}>
          {isDay ? sun(8, 8, 3, true) : <path d="M12 4.5A5 5 0 0 1 6.5 10 5 5 0 1 0 12 4.5z" />}
          <path d="M9 20a4 4 0 0 1-.4-7.98A5 5 0 0 1 18 12.8 3.6 3.6 0 0 1 17.6 20H9z" transform="translate(0 -1)" />
        </svg>
      )
    case 'cloudy':
      return (
        <svg {...common}>
          <path d={CLOUD} />
        </svg>
      )
    case 'fog':
      return (
        <svg {...common}>
          <path d="M7 14a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 4.8 4.6 4.6 0 0 1 17.5 14H7z" transform="translate(0 1)" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <line x1="7" y1="21" x2="17" y2="21" />
        </svg>
      )
    case 'drizzle':
    case 'rain':
      return (
        <svg {...common}>
          <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 5.8 4.6 4.6 0 0 1 17.5 15H7z" />
          <line x1="8" y1="18" x2="7" y2="21" />
          <line x1="12" y1="18" x2="11" y2="21" />
          {kind === 'rain' && <line x1="16" y1="18" x2="15" y2="21" />}
        </svg>
      )
    case 'snow':
      return (
        <svg {...common}>
          <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 5.8 4.6 4.6 0 0 1 17.5 15H7z" />
          <circle cx="8" cy="19" r="0.6" />
          <circle cx="12" cy="20.5" r="0.6" />
          <circle cx="16" cy="19" r="0.6" />
        </svg>
      )
    case 'thunder':
      return (
        <svg {...common}>
          <path d="M7 15a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 5.8 4.6 4.6 0 0 1 17.5 15H7z" />
          <path d="M12.5 12l-2.5 4h3l-1.5 4.5" />
        </svg>
      )
  }
}

export const Heart = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3 5 6.3 5c2 0 3.6 1.1 4.4 2.6h.6C12.1 6.1 13.7 5 15.7 5 19 5 20.8 8.4 19.5 11.6 19.5 11.6 12 21 12 21z" transform="translate(0 -0.5) scale(1 1)" />
  </svg>
)

export const Swap = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4L3 8l4 4" />
    <path d="M3 8h14" />
    <path d="M17 20l4-4-4-4" />
    <path d="M21 16H7" />
  </svg>
)

export const Chevron = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Drop = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z" />
  </svg>
)

export const AlertIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M12 4l9 16H3L12 4z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17.3" r="0.4" />
  </svg>
)

export const Bell = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
)

export const Close = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const Pin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
    <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
)
