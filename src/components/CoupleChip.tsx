import { Heart } from './icons'
import { formatDiff, tempGap, timeDiffMin } from '../lib/couple'
import type { Place } from '../lib/types'
import { useWeather } from '../lib/useWeather'

export function CoupleChip({ him, her }: { him: Place; her: Place }) {
  const a = useWeather(him).data
  const b = useWeather(her).data
  const diff = timeDiffMin(him, her)
  const gap = a && b ? tempGap(a.current.temp, b.current.temp) : null
  const timeText =
    diff === 0 ? 'Same time' : `${her.name} is ${formatDiff(diff)} ${diff > 0 ? 'ahead' : 'behind'}`

  return (
    <div
      className="glass pointer-events-none absolute left-1/2 top-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 whitespace-nowrap px-4 py-2 text-[12.5px] font-light"
      style={{ borderRadius: 999 }}
    >
      <span className="text-rose-200/90">
        <Heart size={13} />
      </span>
      <span>{timeText}</span>
      {gap && (
        <>
          <span className="h-3 w-px bg-white/30" />
          <span>{gap.text}</span>
        </>
      )}
    </div>
  )
}
